package main

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
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
	Kind string        `json:"kind"`
	Data redditComment `json:"data"`
}

type redditComment struct {
	Author     string          `json:"author"`
	CreatedUTC float64         `json:"created_utc"`
	BodyHTML   string          `json:"body_html"`
	Replies    json.RawMessage `json:"replies"` // string "" or listing object
}

// HN Algolia API types
type hnItem struct {
	ID        int      `json:"id"`
	Author    string   `json:"author"`
	CreatedAt string   `json:"created_at"`
	Text      string   `json:"text"`
	Children  []hnItem `json:"children"`
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
	if strings.Contains(rawURL, "news.ycombinator.com/item?id=") {
		h, err := fetchHNComments(rawURL)
		if err != nil {
			return ""
		}
		return h
	}
	if strings.Contains(rawURL, ".json") {
		h, err := fetchRedditComments(rawURL)
		if err != nil {
			return ""
		}
		return h
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

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=300")

	if strings.Contains(rawURL, "news.ycombinator.com/item?id=") {
		htmlContent, err := fetchHNComments(rawURL)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadGateway)
			return
		}
		json.NewEncoder(w).Encode(CommentsResponse{HTML: htmlContent})
		return
	}

	if strings.Contains(rawURL, ".json") {
		htmlContent, err := fetchRedditComments(rawURL)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadGateway)
			return
		}
		json.NewEncoder(w).Encode(CommentsResponse{HTML: htmlContent})
		return
	}

	// Non-Reddit/HN: extract with Readability
	article, err := fetchReadable(rawURL)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}
	json.NewEncoder(w).Encode(CommentsResponse{HTML: article.Content})
}

// ── HN ───────────────────────────────────────────────────────────────────────

func fetchHNComments(rawURL string) (string, error) {
	// Extract item ID from URL like https://news.ycombinator.com/item?id=12345
	idx := strings.Index(rawURL, "?id=")
	if idx < 0 {
		return "", fmt.Errorf("could not find item ID in HN URL")
	}
	itemID := rawURL[idx+4:]
	if i := strings.IndexAny(itemID, "&# "); i >= 0 {
		itemID = itemID[:i]
	}
	if itemID == "" {
		return "", fmt.Errorf("empty item ID in HN URL")
	}

	algoliaURL := "https://hn.algolia.com/api/v1/items/" + itemID
	client := &http.Client{Timeout: 30 * time.Second}
	hnReq, err := http.NewRequest("GET", algoliaURL, nil)
	if err != nil {
		return "", err
	}
	hnReq.Header.Set("User-Agent", userAgent)
	resp, err := client.Do(hnReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var item hnItem
	if err := json.Unmarshal(body, &item); err != nil {
		return "", fmt.Errorf("failed to parse HN JSON: %w", err)
	}

	if len(item.Children) == 0 {
		return "<p>No comments yet.</p>", nil
	}

	var sb strings.Builder
	counter := 0
	limit := len(item.Children)
	if limit > maxTopLevelComments {
		limit = maxTopLevelComments
	}
	for i := 0; i < limit; i++ {
		renderHNComment(&sb, item.Children[i], 0, &counter)
	}
	return sb.String(), nil
}

func renderHNComment(sb *strings.Builder, item hnItem, depth int, counter *int) {
	n := *counter
	*counter++
	collapseID := fmt.Sprintf("hn-c-%d", n)
	author := item.Author
	if author == "" {
		author = "[deleted]"
	}

	dateStr := ""
	if item.CreatedAt != "" {
		if t, err := time.Parse(time.RFC3339, item.CreatedAt); err == nil {
			dateStr = t.Format("2006-01-02")
		} else {
			// fallback: take the date portion of the ISO string
			if len(item.CreatedAt) >= 10 {
				dateStr = item.CreatedAt[:10]
			}
		}
	}

	sb.WriteString(`<div class="hn-comment">`)
	sb.WriteString(`<div class="hn-comment-header">`)
	fmt.Fprintf(sb, `<span id="%s-btn" class="hn-toggle" onclick="toggleHNComment('%s')">[&minus;]</span> `, collapseID, collapseID)
	fmt.Fprintf(sb, `<strong class="hn-author">%s</strong>`, html.EscapeString(author))
	if dateStr != "" {
		fmt.Fprintf(sb, ` <span class="hn-date">%s</span>`, dateStr)
	}
	sb.WriteString(`</div>`)

	fmt.Fprintf(sb, `<div id="%s" class="hn-comment-body">`, collapseID)
	if item.Text != "" {
		fmt.Fprintf(sb, `<div class="hn-comment-text">%s</div>`, item.Text)
	} else {
		sb.WriteString(`<div class="hn-comment-text hn-deleted">[deleted]</div>`)
	}
	for _, child := range item.Children {
		renderHNComment(sb, child, depth+1, counter)
	}
	sb.WriteString(`</div>`) // hn-comment-body
	sb.WriteString(`</div>`) // hn-comment
}

// ── Reddit ───────────────────────────────────────────────────────────────────

func fetchRedditComments(rawURL string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", userAgent)

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
	counter := 0
	comments := listings[1].Data.Children
	limit := len(comments)
	if limit > maxTopLevelComments {
		limit = maxTopLevelComments
	}

	for i := 0; i < limit; i++ {
		replyCount := 0
		renderRedditComment(&sb, comments[i], 0, true, &replyCount, &counter)
	}

	if sb.Len() == 0 {
		return "<p>No comments found.</p>", nil
	}
	return sb.String(), nil
}

func renderRedditComment(sb *strings.Builder, thing redditThing, depth int, isTopLevel bool, replyCount *int, counter *int) {
	if thing.Kind == "more" {
		return
	}
	if !isTopLevel {
		if *replyCount >= maxRepliesPerComment {
			return
		}
		(*replyCount)++
	}

	n := *counter
	*counter++
	collapseID := fmt.Sprintf("rc-%d", n)
	d := thing.Data
	author := d.Author
	if author == "" {
		author = "[deleted]"
	}

	sb.WriteString(`<div class="hn-comment">`)
	sb.WriteString(`<div class="hn-comment-header">`)
	fmt.Fprintf(sb, `<span id="%s-btn" class="hn-toggle" onclick="toggleRedditComment('%s')">[&minus;]</span> `, collapseID, collapseID)
	fmt.Fprintf(sb, `<strong class="hn-author">%s</strong>`, html.EscapeString(author))
	if d.CreatedUTC > 0 {
		t := time.Unix(int64(d.CreatedUTC), 0)
		fmt.Fprintf(sb, ` <span class="hn-date">%s</span>`, t.Format("2006-01-02"))
	}
	sb.WriteString(`</div>`)

	fmt.Fprintf(sb, `<div id="%s" class="hn-comment-body">`, collapseID)
	if d.BodyHTML != "" {
		decoded := html.UnescapeString(d.BodyHTML)
		text := stripHTMLTags(decoded)
		text = strings.ReplaceAll(text, "\n", "<br/>")
		fmt.Fprintf(sb, `<div class="hn-comment-text">%s</div>`, text)
	}

	// Recurse into replies inside the collapsible body
	if len(d.Replies) > 0 && d.Replies[0] == '{' {
		var repliesListing redditListing
		if err := json.Unmarshal(d.Replies, &repliesListing); err == nil {
			for _, child := range repliesListing.Data.Children {
				renderRedditComment(sb, child, depth+1, false, replyCount, counter)
			}
		}
	}

	sb.WriteString(`</div>`) // hn-comment-body
	sb.WriteString(`</div>`) // hn-comment
}
