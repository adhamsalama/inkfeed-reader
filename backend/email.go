package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"os"
	"time"

	"github.com/adhamsalama/rss-backend/mobi"
)

// EmailAttachment is a file to attach to an email.
type EmailAttachment struct {
	Filename string
	Content  []byte
	MimeType string
}

// EmailMessage is the provider-agnostic email to send.
type EmailMessage struct {
	To          string
	Subject     string
	HTMLContent string
	Attachments []EmailAttachment
}

// EmailSender is the interface for sending emails.
// Swap implementations by changing newEmailSender().
type EmailSender interface {
	Send(msg EmailMessage) error
}

// newEmailSender returns the configured EmailSender.
func newEmailSender() EmailSender {
	return &BrevoSender{
		APIKey:    os.Getenv("BREVO_API_KEY"),
		FromEmail: os.Getenv("EMAIL_FROM"),
		FromName:  os.Getenv("EMAIL_FROM_NAME"),
	}
}

// BrevoSender sends emails via the Brevo (Sendinblue) transactional API.
type BrevoSender struct {
	APIKey    string
	FromEmail string
	FromName  string
}

func (b *BrevoSender) Send(msg EmailMessage) error {
	type contact struct {
		Email string `json:"email"`
		Name  string `json:"name,omitempty"`
	}
	type attachment struct {
		Name    string `json:"name"`
		Content string `json:"content"` // base64-encoded
	}
	type payload struct {
		Sender      contact      `json:"sender"`
		To          []contact    `json:"to"`
		Subject     string       `json:"subject"`
		HTMLContent string       `json:"htmlContent"`
		Attachment  []attachment `json:"attachment,omitempty"`
	}

	p := payload{
		Sender:      contact{Email: b.FromEmail, Name: b.FromName},
		To:          []contact{{Email: msg.To}},
		Subject:     msg.Subject,
		HTMLContent: msg.HTMLContent,
	}
	for _, a := range msg.Attachments {
		p.Attachment = append(p.Attachment, attachment{
			Name:    a.Filename,
			Content: base64.StdEncoding.EncodeToString(a.Content),
		})
	}

	body, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("marshal brevo request: %w", err)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("api-key", b.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var errBody map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&errBody)
		return fmt.Errorf("brevo API error %d: %v", resp.StatusCode, errBody)
	}
	return nil
}

// EmailRequest is the request body for POST /email.
type EmailRequest struct {
	URL string `json:"url"`
	To  string `json:"to"`
}

func emailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req EmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.URL == "" || req.To == "" {
		jsonError(w, "url and to fields required", http.StatusBadRequest)
		return
	}

	article, err := fetchReadable(req.URL)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadGateway)
		return
	}

	title := article.Title
	if title == "" {
		title = "Article"
	}

	xhtmlBody := "<h1>" + html.EscapeString(title) + "</h1>" + article.Content
	epubData, err := generateEpub(title, "", xhtmlBody)
	if err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Use MOBI as a fallback body so clients without EPUB support still get something
	mobiHTML := "<html><body><h1>" + html.EscapeString(title) + "</h1>" + article.Content + "</body></html>"
	_ = mobiHTML

	msg := EmailMessage{
		To:          req.To,
		Subject:     title,
		HTMLContent: "<p>Your article is attached as an EPUB file.</p><p><strong>" + html.EscapeString(title) + "</strong></p>",
		Attachments: []EmailAttachment{{
			Filename: sanitizeFilename(title) + ".epub",
			Content:  epubData,
			MimeType: "application/epub+zip",
		}},
	}

	// Also attach MOBI for Kindle email delivery
	mobiData, err := mobi.Write(mobi.Book{
		Title:   title,
		Content: "<html><body><h1>" + html.EscapeString(title) + "</h1>" + article.Content + "</body></html>",
	})
	if err == nil {
		msg.Attachments = append(msg.Attachments, EmailAttachment{
			Filename: sanitizeFilename(title) + ".mobi",
			Content:  mobiData,
			MimeType: "application/x-mobipocket-ebook",
		})
	}

	sender := newEmailSender()
	if err := sender.Send(msg); err != nil {
		jsonError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
