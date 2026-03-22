package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/adhamsalama/rss-backend/db"
	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)

var queries *db.Queries

var allowedOrigin = "https://reader.inkfeed.xyz"

var feedProxyURL = "https://throbbing-morning-e187.adhamsalama.workers.dev"

var articleCacheTTL = time.Hour
var commentsCacheTTL = 30 * time.Minute

type contextKey string

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != allowedOrigin {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func main() {
	godotenv.Load()

	if os.Getenv("ENV") == "local" {
		allowedOrigin = "http://localhost:8000"
	}
	if v := os.Getenv("FEED_PROXY_URL"); v != "" {
		feedProxyURL = v
	}
	if v, err := strconv.Atoi(os.Getenv("ARTICLE_CACHE_TTL_MINUTES")); err == nil {
		articleCacheTTL = time.Duration(v) * time.Minute
	}
	if v, err := strconv.Atoi(os.Getenv("COMMENTS_CACHE_TTL_MINUTES")); err == nil {
		commentsCacheTTL = time.Duration(v) * time.Minute
	}

	port := flag.String("port", "8080", "port to listen on")
	flag.Parse()

	if envPort := os.Getenv("PORT"); envPort != "" {
		*port = envPort
	}

	sqlDB, err := sql.Open("sqlite", "inkfeed.db")
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	if _, err := sqlDB.Exec(
		`CREATE TABLE IF NOT EXISTS users (
			id            INTEGER  PRIMARY KEY AUTOINCREMENT,
			email         TEXT     NOT NULL UNIQUE,
			password_hash TEXT     NOT NULL,
			created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS sessions (
			token      TEXT     PRIMARY KEY,
			user_id    INTEGER  NOT NULL REFERENCES users(id),
			expires_at DATETIME NOT NULL
		);
		CREATE TABLE IF NOT EXISTS user_preferences (
			user_id           INTEGER PRIMARY KEY REFERENCES users(id),
			font_size         REAL,
			letter_spacing    REAL,
			line_height       REAL,
			cors_proxy_url    TEXT,
			epub_embed_images INTEGER,
			email_to          TEXT,
			updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS user_saved_feeds (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id  INTEGER NOT NULL REFERENCES users(id),
			url      TEXT    NOT NULL,
			title    TEXT    NOT NULL,
			position INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS user_feed_groups (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id  INTEGER NOT NULL REFERENCES users(id),
			name     TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS user_feed_group_items (
			id       INTEGER PRIMARY KEY AUTOINCREMENT,
			group_id INTEGER NOT NULL REFERENCES user_feed_groups(id),
			url      TEXT NOT NULL,
			title    TEXT NOT NULL,
			position INTEGER NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS user_favorites (
			id         INTEGER  PRIMARY KEY AUTOINCREMENT,
			user_id    INTEGER  NOT NULL REFERENCES users(id),
			url        TEXT     NOT NULL,
			title      TEXT     NOT NULL DEFAULT '',
			feed_title TEXT     NOT NULL DEFAULT '',
			pub_date   TEXT     NOT NULL DEFAULT '',
			saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
	// Add columns introduced after initial table creation (ignored if already present)
	sqlDB.Exec(`ALTER TABLE user_preferences ADD COLUMN email_to TEXT`)
	sqlDB.Exec(`CREATE TABLE IF NOT EXISTS persistent_cache (key TEXT PRIMARY KEY, body TEXT NOT NULL, content_type TEXT NOT NULL, expires_at DATETIME NOT NULL)`)

	queries = db.New(sqlDB)

	mux := http.NewServeMux()
	protected := func(h http.HandlerFunc) http.Handler {
		return corsMiddleware(authMiddleware(rateLimitMiddleware(http.HandlerFunc(h))))
	}

	mux.Handle("/signup", corsMiddleware(signupRateLimitMiddleware(http.HandlerFunc(signupHandler))))
	mux.Handle("/signin", corsMiddleware(signinRateLimitMiddleware(http.HandlerFunc(signinHandler))))
	mux.Handle("/signout", corsMiddleware(http.HandlerFunc(signoutHandler)))
	mux.Handle("/preferences", protected(preferencesHandler))
	mux.Handle("/saved-feeds", protected(savedFeedsHandler))
	mux.Handle("/feed-groups", protected(feedGroupsHandler))
	mux.Handle("/favorites", protected(favoritesHandler))
	mux.Handle("/feed", protected(cached(feedHandler)))
	mux.Handle("/article", protected(persistentCached(articleHandler, articleCacheTTL)))
	mux.Handle("/text", protected(textHandler))
	mux.Handle("/comments", protected(persistentCached(commentsHandler, commentsCacheTTL)))
	mux.Handle("/mobi", protected(mobiHandler))
	mux.Handle("/epub", protected(epubHandler))
	mux.Handle("/reddit-post", protected(redditPostHandler))
	mux.Handle("/decode-google-news", protected(decodeGoogleNewsHandler))
	mux.Handle("/email", corsMiddleware(authMiddleware(emailRateLimitMiddleware(http.HandlerFunc(emailHandler)))))

	addr := ":" + *port
	log.Printf("Server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
