package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/adhamsalama/rss-backend/db"
	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
)

var queries *db.Queries

const allowedOrigin = "https://reader.inkfeed.xyz"

const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != allowedOrigin {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
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
		)`,
	); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
	queries = db.New(sqlDB)

	mux := http.NewServeMux()
	protected := func(h http.HandlerFunc) http.Handler {
		return corsMiddleware(authMiddleware(rateLimitMiddleware(http.HandlerFunc(h))))
	}

	mux.Handle("/signup", corsMiddleware(http.HandlerFunc(signupHandler)))
	mux.Handle("/signin", corsMiddleware(http.HandlerFunc(signinHandler)))
	mux.Handle("/feed", protected(cached(feedHandler)))
	mux.Handle("/article", protected(cached(articleHandler)))
	mux.Handle("/text", protected(textHandler))
	mux.Handle("/comments", protected(cached(commentsHandler)))
	mux.Handle("/mobi", protected(mobiHandler))
	mux.Handle("/epub", protected(epubHandler))
	mux.Handle("/reddit-post", protected(redditPostHandler))
	mux.Handle("/decode-google-news", protected(decodeGoogleNewsHandler))
	mux.Handle("/email", corsMiddleware(authMiddleware(emailRateLimitMiddleware(http.HandlerFunc(emailHandler)))))
	mux.Handle("/email-file", corsMiddleware(authMiddleware(emailRateLimitMiddleware(http.HandlerFunc(emailFileHandler)))))

	addr := ":" + *port
	log.Printf("Server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
