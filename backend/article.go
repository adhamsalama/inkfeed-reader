package main

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"strings"
	"time"

	readability "github.com/go-shiori/go-readability"
)

type ArticleResponse struct {
	Title         string `json:"title"`
	Content       string `json:"content"`
	Byline        string `json:"byline"`
	SiteName      string `json:"siteName"`
	PublishedTime string `json:"publishedTime"`
	WordCount     int    `json:"wordCount"`
}

func textHandler(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		jsonError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	article, err := fetchReadable(rawURL)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}

	filename := sanitizeFilename(article.Title) + ".txt"
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Write([]byte(article.TextContent))
}

func articleHandler(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		jsonError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	article, err := fetchReadable(rawURL)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	publishedTime := ""
	if article.PublishedTime != nil {
		publishedTime = article.PublishedTime.Format("2 January 2006")
	}
	json.NewEncoder(w).Encode(ArticleResponse{
		Title:         article.Title,
		Content:       article.Content,
		Byline:        article.Byline,
		SiteName:      article.SiteName,
		PublishedTime: publishedTime,
		WordCount:     len(strings.Fields(article.TextContent)),
	})
}

// articleMetaHTML returns an HTML snippet with article metadata.
func articleMetaHTML(article readability.Article) string {
	var sb strings.Builder

	// "author @ sitename" line
	byline := strings.TrimSpace(article.Byline)
	siteName := strings.TrimSpace(article.SiteName)
	if byline != "" && siteName != "" {
		sb.WriteString(`<p><em>` + html.EscapeString(byline) + ` @ ` + html.EscapeString(siteName) + `</em></p>`)
	} else if byline != "" {
		sb.WriteString(`<p><em>` + html.EscapeString(byline) + `</em></p>`)
	} else if siteName != "" {
		sb.WriteString(`<p><em>` + html.EscapeString(siteName) + `</em></p>`)
	}

	// reading time (avg 200 wpm)
	wordCount := len(strings.Fields(article.TextContent))
	if wordCount > 0 {
		minutes := wordCount / 200
		if minutes < 1 {
			minutes = 1
		}
		sb.WriteString(`<p><em>` + fmt.Sprintf("%d min read", minutes) + `</em></p>`)
	}

	// published date
	if article.PublishedTime != nil {
		sb.WriteString(`<p><em>Published:` + article.PublishedTime.Format("2 January 2006") + `</em></p>`)
	}

	if sb.Len() > 0 {
		sb.WriteString("<hr/>")
	}
	return sb.String()
}

// fetchReadable fetches a URL and runs Mozilla Readability on the response.
func fetchReadable(rawURL string) (readability.Article, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return readability.Article{}, err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(req)
	if err != nil {
		return readability.Article{}, err
	}
	defer resp.Body.Close()

	parsedURL, _ := url.Parse(rawURL)
	return readability.FromReader(resp.Body, parsedURL)
}
