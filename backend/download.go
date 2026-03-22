package main

import (
	"encoding/json"
	"html"
	"net/http"
	"regexp"
	"strings"
	"sync"

	"github.com/adhamsalama/inkfeed-backend/mobi"
)

type MobiRequest struct {
	URL         string   `json:"url"`         // single article
	URLs        []string `json:"urls"`        // multiple articles
	Title       string   `json:"title"`
	Author      string   `json:"author"`
	CommentsURL string   `json:"commentsUrl"` // optional comments page URL
}

var unsafeCharsRe = regexp.MustCompile(`[^a-zA-Z0-9 ]+`)

func sanitizeFilename(s string) string {
	return strings.TrimSpace(unsafeCharsRe.ReplaceAllString(s, ""))
}

func mobiHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req MobiRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var htmlContent string

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
		htmlContent = "<html><body><h1>" + html.EscapeString(req.Title) + "</h1>" + link + articleMetaHTML(article) + article.Content
		if commentsHTML != "" {
			htmlContent += "<hr/><h2>Comments</h2>" + commentsHTML
		}
		htmlContent += "</body></html>"

	case len(req.URLs) > 0:
		htmlContent = fetchAndCombine(req.URLs, req.Title)

	default:
		jsonError(w, "url or urls field required", http.StatusBadRequest)
		return
	}

	data, err := mobi.Write(mobi.Book{
		Title:   req.Title,
		Author:  req.Author,
		Content: htmlContent,
	})
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	filename := sanitizeFilename(req.Title) + ".mobi"
	w.Header().Set("Content-Type", "application/x-mobipocket-ebook")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Write(data)
}

// fetchAndCombine fetches all URLs concurrently (max 5 at a time) and
// returns a single HTML document combining all article contents.
func fetchAndCombine(urls []string, feedTitle string) string {
	type result struct {
		index   int
		title   string
		meta    string
		content string
		err     error
	}

	results := make([]result, len(urls))
	sem := make(chan struct{}, 5)
	var wg sync.WaitGroup

	for i, u := range urls {
		wg.Add(1)
		go func(idx int, url string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			article, err := fetchReadable(url)
			if err != nil {
				results[idx] = result{index: idx, err: err}
				return
			}
			results[idx] = result{index: idx, title: article.Title, meta: articleMetaHTML(article), content: `<p><a href="` + html.EscapeString(url) + `">` + html.EscapeString(url) + `</a></p>` + article.Content}
		}(i, u)
	}
	wg.Wait()

	var sb strings.Builder
	sb.WriteString("<html><body>")
	sb.WriteString("<h1>" + html.EscapeString(feedTitle) + "</h1><hr/>")
	for _, r := range results {
		if r.err != nil {
			sb.WriteString("<h2>[Failed to fetch article]</h2><hr/>")
		} else {
			sb.WriteString("<h2>" + html.EscapeString(r.title) + "</h2>")
			sb.WriteString(r.meta)
			sb.WriteString(r.content)
			sb.WriteString("<hr/>")
		}
	}
	sb.WriteString("</body></html>")
	return sb.String()
}
