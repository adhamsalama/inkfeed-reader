package main

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type CommentsResponse struct {
	HTML string `json:"html"`
}

// Reddit JSON types
type redditListing struct {
	Data struct {
		Children []redditThing `json:"children"`
	} `json:"data"`
}

type redditThing struct {
	Kind string          `json:"kind"`
	Data redditComment   `json:"data"`
}

type redditComment struct {
	Author     string          `json:"author"`
	CreatedUTC float64         `json:"created_utc"`
	BodyHTML   string          `json:"body_html"`
	Replies    json.RawMessage `json:"replies"` // string "" or listing object
}

var htmlTagRe = regexp.MustCompile(`<[^>]+>`)

func stripHTMLTags(s string) string {
	return htmlTagRe.ReplaceAllString(s, "")
}

const (
	maxTopLevelComments  = 100
	maxRepliesPerComment = 50
)

// fetchCommentsHTML fetches and returns rendered comment HTML for the given URL.
// Returns empty string on error so callers can treat it as optional.
func fetchCommentsHTML(rawURL string) string {
	if rawURL == "" {
		return ""
	}
	if strings.Contains(rawURL, ".json") {
		html, err := fetchRedditComments(rawURL)
		if err != nil {
			return ""
		}
		return html
	}
	article, err := fetchReadable(rawURL)
	if err != nil {
		return ""
	}
	return article.Content
}

func commentsHandler(w http.ResponseWriter, r *http.Request) {
	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		jsonError(w, "url parameter required", http.StatusBadRequest)
		return
	}

	isReddit := strings.Contains(rawURL, ".json")
	if isReddit {
		htmlContent, err := fetchRedditComments(rawURL)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadGateway)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "public, max-age=300")
		json.NewEncoder(w).Encode(CommentsResponse{HTML: htmlContent})
		return
	}

	// Non-Reddit: extract with Readability
	article, err := fetchReadable(rawURL)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")
	json.NewEncoder(w).Encode(CommentsResponse{HTML: article.Content})
}

func fetchRedditComments(rawURL string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; RSSReader/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Reddit returns [postListing, commentsListing]
	var listings []redditListing
	if err := json.NewDecoder(resp.Body).Decode(&listings); err != nil {
		return "", fmt.Errorf("failed to parse Reddit JSON: %w", err)
	}
	if len(listings) < 2 {
		return "", fmt.Errorf("unexpected Reddit response format")
	}

	var sb strings.Builder
	comments := listings[1].Data.Children
	limit := len(comments)
	if limit > maxTopLevelComments {
		limit = maxTopLevelComments
	}

	for i := 0; i < limit; i++ {
		replyCount := 0
		renderRedditComment(&sb, comments[i], 0, true, &replyCount)
	}

	if sb.Len() == 0 {
		return "<p>No comments found.</p>", nil
	}
	return sb.String(), nil
}

func renderRedditComment(sb *strings.Builder, thing redditThing, depth int, isTopLevel bool, replyCount *int) {
	if thing.Kind == "more" {
		return
	}
	if !isTopLevel {
		if *replyCount >= maxRepliesPerComment {
			return
		}
		(*replyCount)++
	}

	d := thing.Data
	indent := depth * 20
	fmt.Fprintf(sb, `<div style="margin-left:%dpx;margin-bottom:15px;padding:10px;border-left:2px solid #ccc;">`, indent)

	if d.Author != "" {
		fmt.Fprintf(sb, `<p style="font-weight:bold;margin-bottom:5px;">%s</p>`, html.EscapeString(d.Author))
	}
	if d.CreatedUTC > 0 {
		t := time.Unix(int64(d.CreatedUTC), 0)
		fmt.Fprintf(sb, `<p style="font-size:0.85em;color:#666;margin-bottom:10px;">%s</p>`, t.Format(time.RFC1123))
	}
	if d.BodyHTML != "" {
		// body_html is HTML-entity-encoded HTML; decode then strip tags for plain text
		decoded := html.UnescapeString(d.BodyHTML)
		text := stripHTMLTags(decoded)
		text = strings.ReplaceAll(text, "\n", "<br/>")
		fmt.Fprintf(sb, `<div style="margin-bottom:10px;">%s</div>`, text)
	}

	sb.WriteString("</div>")

	// Recurse into replies if present (replies is "" or a listing object)
	if len(d.Replies) > 0 && d.Replies[0] == '{' {
		var repliesListing redditListing
		if err := json.Unmarshal(d.Replies, &repliesListing); err == nil {
			for _, child := range repliesListing.Data.Children {
				renderRedditComment(sb, child, depth+1, false, replyCount)
			}
		}
	}
}
