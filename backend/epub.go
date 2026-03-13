package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"strings"
	"time"
)

type EpubRequest struct {
	URL    string   `json:"url"`
	URLs   []string `json:"urls"`
	Title  string   `json:"title"`
	Author string   `json:"author"`
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
		xhtmlBody = "<h1>" + html.EscapeString(req.Title) + "</h1>" + article.Content

	case len(req.URLs) > 0:
		xhtmlBody = buildEpubMultiArticleBody(req.URLs, req.Title)

	default:
		jsonError(w, "url or urls field required", http.StatusBadRequest)
		return
	}

	data, err := generateEpub(req.Title, req.Author, xhtmlBody)
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
				resultCh <- result{index: idx, title: article.Title, content: article.Content}
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
	sb.WriteString("<h1>" + html.EscapeString(feedTitle) + "</h1><hr/>")
	for _, r := range results {
		if r.err != nil {
			sb.WriteString("<h2>[Failed to fetch article]</h2><hr/>")
		} else {
			sb.WriteString("<h2>" + html.EscapeString(r.title) + "</h2>")
			sb.WriteString(r.content)
			sb.WriteString("<hr/>")
		}
	}
	return sb.String()
}

func generateEpub(title, author, bodyHTML string) ([]byte, error) {
	uid := fmt.Sprintf("%x", time.Now().UnixNano())
	modTime := time.Now().UTC().Format("2006-01-02T15:04:05Z")

	xhtml := `<?xml version="1.0" encoding="UTF-8"?>` +
		`<!DOCTYPE html>` +
		`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>` +
		html.EscapeString(title) +
		`</title></head><body>` +
		bodyHTML +
		`</body></html>`

	opf := `<?xml version="1.0" encoding="UTF-8"?>` +
		`<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">` +
		`<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
		`<dc:title>` + html.EscapeString(title) + `</dc:title>` +
		`<dc:language>en</dc:language>` +
		`<dc:creator>` + html.EscapeString(author) + `</dc:creator>` +
		`<dc:identifier id="BookId">urn:uuid:` + uid + `</dc:identifier>` +
		`<meta property="dcterms:modified">` + modTime + `</meta>` +
		`</metadata>` +
		`<manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/></manifest>` +
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

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
