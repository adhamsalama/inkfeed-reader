package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/mmcdole/gofeed"
	gofeedrss "github.com/mmcdole/gofeed/rss"
)

type Article struct {
	Index       int    `json:"index"`
	Title       string `json:"title"`
	Link        string `json:"link"`
	Comments    string `json:"comments"`
	Description string `json:"description"`
	Content     string `json:"content"`
	PubDate     string `json:"pubDate"`
}

type FeedResponse struct {
	Title    string    `json:"title"`
	Articles []Article `json:"articles"`
}

func feedHandler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		jsonError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	// Include legacy cipher suites for compatibility with older servers (e.g. fsf.org)
	allSuites := append(tls.CipherSuites(), tls.InsecureCipherSuites()...)
	cipherIDs := make([]uint16, len(allSuites))
	for i, s := range allSuites {
		cipherIDs[i] = s.ID
	}
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{CipherSuites: cipherIDs},
	}
	client := &http.Client{Timeout: 30 * time.Second, Transport: transport}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	req.Header.Set("User-Agent", userAgent)

	httpResp, err := client.Do(req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer httpResp.Body.Close()

	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}

	resp := parseFeed(url, body)
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	json.NewEncoder(w).Encode(resp)
}

// parseFeed tries the RSS parser first (to preserve the <comments> field),
// then falls back to gofeed's unified parser for Atom and other formats.
func parseFeed(url string, body []byte) FeedResponse {
	rssParser := &gofeedrss.Parser{}
	if rssFeed, err := rssParser.Parse(bytes.NewReader(body)); err != nil {
		log.Printf("rss parser error for %s: %v", url, err)
	} else {
		return fromRSS(rssFeed)
	}

	fp := gofeed.NewParser()
	feed, err := fp.Parse(bytes.NewReader(body))
	if err != nil {
		log.Printf("gofeed parser error for %s: %v", url, err)
		return FeedResponse{}
	}
	return fromGofeed(feed)
}

func fromRSS(feed *gofeedrss.Feed) FeedResponse {
	resp := FeedResponse{Title: feed.Title}
	for i, item := range feed.Items {
		comments := item.Comments
		if comments == "" && strings.Contains(item.Link, "reddit.com") {
			comments = item.Link + "/.json"
		}

		pubDate := ""
		if item.PubDateParsed != nil {
			pubDate = item.PubDateParsed.Format(time.RFC1123)
		} else if item.PubDate != "" {
			pubDate = item.PubDate
		}

		// content:encoded lives in the content namespace extension
		content := ""
		if contentExt, ok := item.Extensions["content"]; ok {
			if encoded, ok := contentExt["encoded"]; ok && len(encoded) > 0 {
				content = encoded[0].Value
			}
		}

		resp.Articles = append(resp.Articles, Article{
			Index:       i,
			Title:       item.Title,
			Link:        item.Link,
			Comments:    comments,
			Description: item.Description,
			Content:     content,
			PubDate:     pubDate,
		})
	}
	return resp
}

func fromGofeed(feed *gofeed.Feed) FeedResponse {
	resp := FeedResponse{Title: feed.Title}
	for i, item := range feed.Items {
		comments := ""
		if strings.Contains(item.Link, "reddit.com") {
			comments = item.Link + "/.json"
		}
		// For non-Reddit feeds that put comments in extensions
		if comments == "" {
			if extMap, ok := item.Extensions[""]; ok {
				if vals, ok := extMap["comments"]; ok && len(vals) > 0 {
					comments = vals[0].Value
				}
			}
		}

		pubDate := ""
		if item.PublishedParsed != nil {
			pubDate = item.PublishedParsed.Format(time.RFC1123)
		} else if item.Published != "" {
			pubDate = item.Published
		}

		resp.Articles = append(resp.Articles, Article{
			Index:       i,
			Title:       item.Title,
			Link:        item.Link,
			Comments:    comments,
			Description: item.Description,
			Content:     item.Content,
			PubDate:     pubDate,
		})
	}
	return resp
}
