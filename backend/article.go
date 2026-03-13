package main

import (
	"encoding/json"
	"net/http"
	"net/url"
	"time"

	readability "github.com/go-shiori/go-readability"
)

type ArticleResponse struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Byline  string `json:"byline"`
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
	json.NewEncoder(w).Encode(ArticleResponse{
		Title:   article.Title,
		Content: article.Content,
		Byline:  article.Byline,
	})
}

// fetchReadable fetches a URL and runs Mozilla Readability on the response.
func fetchReadable(rawURL string) (readability.Article, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return readability.Article{}, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; RSSReader/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return readability.Article{}, err
	}
	defer resp.Body.Close()

	parsedURL, _ := url.Parse(rawURL)
	return readability.FromReader(resp.Body, parsedURL)
}
