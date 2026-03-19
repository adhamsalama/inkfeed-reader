package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"image"
	"image/jpeg"
	_ "image/png"
	_ "golang.org/x/image/webp"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type EpubRequest struct {
	URL         string   `json:"url"`
	URLs        []string `json:"urls"`
	Title       string   `json:"title"`
	Author      string   `json:"author"`
	CommentsURL string   `json:"commentsUrl"`
	EmbedImages *bool    `json:"embedImages"`
}

func epubHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req EpubRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var xhtmlBody string

	switch {
	case req.URL != "":
		article, err := fetchReadable(req.URL)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadGateway)
			return
		}
		if req.Title == "" {
			req.Title = article.Title
		}
		commentsHTML := fetchCommentsHTML(req.CommentsURL)
		link := `<p><a href="` + html.EscapeString(req.URL) + `">` + html.EscapeString(req.URL) + `</a></p>`
		xhtmlBody = "<h1>" + html.EscapeString(req.Title) + "</h1>" + link + articleMetaHTML(article) + article.Content
		if commentsHTML != "" {
			xhtmlBody += "<hr/><h2>Comments</h2>" + commentsHTML
		}

	case len(req.URLs) > 0:
		xhtmlBody = buildEpubMultiArticleBody(req.URLs, req.Title)

	default:
		jsonError(w, "url or urls field required", http.StatusBadRequest)
		return
	}

	embedImages := req.EmbedImages == nil || *req.EmbedImages
	data, err := generateEpub(req.Title, req.Author, xhtmlBody, embedImages)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	filename := sanitizeFilename(req.Title) + ".epub"
	w.Header().Set("Content-Type", "application/epub+zip")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Write(data)
}

func buildEpubMultiArticleBody(urls []string, feedTitle string) string {
	// Reuse the same concurrent fetch logic as MOBI
	type result struct {
		index   int
		title   string
		meta    string
		content string
		err     error
	}

	results := make([]result, len(urls))
	sem := make(chan struct{}, 5)
	done := make(chan struct{})

	resultCh := make(chan result, len(urls))

	for i, u := range urls {
		go func(idx int, url string) {
			sem <- struct{}{}
			defer func() { <-sem }()
			article, err := fetchReadable(url)
			if err != nil {
				resultCh <- result{index: idx, err: err}
			} else {
				resultCh <- result{index: idx, title: article.Title, meta: articleMetaHTML(article), content: `<p><a href="` + html.EscapeString(url) + `">` + html.EscapeString(url) + `</a></p>` + article.Content}
			}
		}(i, u)
	}

	go func() {
		for i := 0; i < len(urls); i++ {
			r := <-resultCh
			results[r.index] = r
		}
		close(done)
	}()
	<-done

	var sb strings.Builder
	sb.WriteString("<h1>" + html.EscapeString(feedTitle) + "</h1>")

	// Table of contents
	sb.WriteString("<h2>Contents</h2><ol>")
	for i, r := range results {
		if r.err != nil {
			sb.WriteString(fmt.Sprintf(`<li><a href="#article-%d">[Failed to fetch article]</a></li>`, i))
		} else {
			sb.WriteString(fmt.Sprintf(`<li><a href="#article-%d">%s</a></li>`, i, html.EscapeString(r.title)))
		}
	}
	sb.WriteString("</ol><hr/>")

	for i, r := range results {
		if r.err != nil {
			sb.WriteString(fmt.Sprintf(`<h2 id="article-%d">[Failed to fetch article]</h2><hr/>`, i))
		} else {
			sb.WriteString(fmt.Sprintf(`<h2 id="article-%d">%s</h2>`, i, html.EscapeString(r.title)))
			sb.WriteString(r.meta)
			sb.WriteString(r.content)
			sb.WriteString("<hr/>")
		}
	}
	return sb.String()
}

var (
	imgSrcRe  = regexp.MustCompile(`(?i)<img\s[^>]*\bsrc="(https?://[^"]+)"[^>]*>`)
	brRe      = regexp.MustCompile(`(?i)<br(\s[^>]*)?>`)
	hrRe      = regexp.MustCompile(`(?i)<hr(\s[^>]*)?>`)
	imgVoidRe = regexp.MustCompile(`(?i)<img(\s[^>]*[^/])>`)
)

// sanitizeXHTML fixes void HTML elements to be self-closing, as required by XHTML.
func sanitizeXHTML(s string) string {
	s = brRe.ReplaceAllString(s, "<br/>")
	s = hrRe.ReplaceAllString(s, "<hr/>")
	s = imgVoidRe.ReplaceAllString(s, "<img$1/>")
	return s
}

type embeddedImage struct {
	path      string // relative to OEBPS/, e.g. "images/img0.jpeg"
	mediaType string
	data      []byte
}

// imageQuality returns the JPEG compression quality (1–100) from the
// IMAGE_QUALITY env var, defaulting to 50.
func imageQuality() int {
	if v := os.Getenv("IMAGE_QUALITY"); v != "" {
		if q, err := strconv.Atoi(v); err == nil && q >= 1 && q <= 100 {
			return q
		}
	}
	return 50
}

// compressImage re-encodes a JPEG at the given quality (1–100), and converts
// WebP to JPEG for compatibility with Amazon's conversion service.
// Other formats are returned unchanged.
func compressImage(data []byte, mediaType string, quality int) ([]byte, string) {
	switch mediaType {
	case "image/jpeg":
		img, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return data, mediaType
		}
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			return data, mediaType
		}
		if buf.Len() >= len(data) {
			return data, mediaType
		}
		return buf.Bytes(), mediaType
	case "image/webp":
		img, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return data, mediaType
		}
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			return data, mediaType
		}
		return buf.Bytes(), "image/jpeg"
	default:
		return data, mediaType
	}
}

func downloadAndEmbedImages(bodyHTML string) (string, []embeddedImage) {
	urlToIdx := map[string]int{}
	var images []embeddedImage

	result := imgSrcRe.ReplaceAllStringFunc(bodyHTML, func(match string) string {
		sub := imgSrcRe.FindStringSubmatch(match)
		if len(sub) < 2 {
			return match
		}
		srcURL := sub[1]

		if idx, ok := urlToIdx[srcURL]; ok {
			return strings.Replace(match, `src="`+srcURL+`"`, `src="`+images[idx].path+`"`, 1)
		}

		resp, err := http.Get(srcURL)
		if err != nil {
			log.Printf("epub: failed to download image %s: %v", srcURL, err)
			return match
		}
		defer resp.Body.Close()

		data, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("epub: failed to read image %s: %v", srcURL, err)
			return match
		}

		ct := resp.Header.Get("Content-Type")
		if ct == "" {
			ct = http.DetectContentType(data)
		}
		if i := strings.Index(ct, ";"); i >= 0 {
			ct = strings.TrimSpace(ct[:i])
		}

		if os.Getenv("IMAGE_COMPRESSION") != "false" {
			data, ct = compressImage(data, ct, imageQuality())
		}
		ext := imgMediaTypeExt(ct)
		imgPath := fmt.Sprintf("images/img%d%s", len(images), ext)

		urlToIdx[srcURL] = len(images)
		images = append(images, embeddedImage{path: imgPath, mediaType: ct, data: data})

		return strings.Replace(match, `src="`+srcURL+`"`, `src="`+imgPath+`"`, 1)
	})

	return result, images
}

func imgMediaTypeExt(ct string) string {
	switch ct {
	case "image/jpeg":
		return ".jpeg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/svg+xml":
		return ".svg"
	default:
		return ".img"
	}
}

func generateEpub(title, author, bodyHTML string, embedImages bool) ([]byte, error) {
	uid := fmt.Sprintf("%x", time.Now().UnixNano())
	modTime := time.Now().UTC().Format("2006-01-02T15:04:05Z")

	var images []embeddedImage
	if embedImages {
		bodyHTML, images = downloadAndEmbedImages(bodyHTML)
	}
	bodyHTML = sanitizeXHTML(bodyHTML)

	xhtml := `<?xml version="1.0" encoding="UTF-8"?>` +
		`<!DOCTYPE html>` +
		`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>` +
		html.EscapeString(title) +
		`</title></head><body>` +
		bodyHTML +
		`</body></html>`

	var manifestItems strings.Builder
	manifestItems.WriteString(`<item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>`)
	for i, img := range images {
		manifestItems.WriteString(fmt.Sprintf(`<item id="img%d" href="%s" media-type="%s"/>`, i, img.path, img.mediaType))
	}

	opf := `<?xml version="1.0" encoding="UTF-8"?>` +
		`<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">` +
		`<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
		`<dc:title>` + html.EscapeString(title) + `</dc:title>` +
		`<dc:language>en</dc:language>` +
		`<dc:creator>` + html.EscapeString(author) + `</dc:creator>` +
		`<dc:identifier id="BookId">urn:uuid:` + uid + `</dc:identifier>` +
		`<meta property="dcterms:modified">` + modTime + `</meta>` +
		`</metadata>` +
		`<manifest>` + manifestItems.String() + `</manifest>` +
		`<spine><itemref idref="content"/></spine>` +
		`</package>`

	container := `<?xml version="1.0"?>` +
		`<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">` +
		`<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>` +
		`</container>`

	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	// mimetype must be first and uncompressed
	mw, err := zw.CreateHeader(&zip.FileHeader{
		Name:   "mimetype",
		Method: zip.Store,
	})
	if err != nil {
		return nil, err
	}
	mw.Write([]byte("application/epub+zip"))

	addFile := func(name, content string) error {
		f, err := zw.Create(name)
		if err != nil {
			return err
		}
		_, err = f.Write([]byte(content))
		return err
	}

	if err := addFile("META-INF/container.xml", container); err != nil {
		return nil, err
	}
	if err := addFile("OEBPS/content.opf", opf); err != nil {
		return nil, err
	}
	if err := addFile("OEBPS/content.xhtml", xhtml); err != nil {
		return nil, err
	}

	for _, img := range images {
		f, err := zw.Create("OEBPS/" + img.path)
		if err != nil {
			return nil, err
		}
		if _, err := f.Write(img.data); err != nil {
			return nil, err
		}
	}

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
