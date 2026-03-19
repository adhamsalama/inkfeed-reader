package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
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

	mux := http.NewServeMux()
	protected := func(h http.HandlerFunc) http.Handler {
		return corsMiddleware(authMiddleware(rateLimitMiddleware(http.HandlerFunc(h))))
	}

	mux.Handle("/login", corsMiddleware(http.HandlerFunc(loginHandler)))
	mux.Handle("/feed", protected(cached(feedHandler)))
	mux.Handle("/article", protected(cached(articleHandler)))
	mux.Handle("/text", protected(textHandler))
	mux.Handle("/comments", protected(cached(commentsHandler)))
	mux.Handle("/mobi", protected(mobiHandler))
	mux.Handle("/epub", protected(epubHandler))
	mux.Handle("/reddit-post", protected(redditPostHandler))
	mux.Handle("/decode-google-news", protected(decodeGoogleNewsHandler))
	mux.Handle("/email", protected(emailHandler))
	mux.Handle("/email-file", protected(emailFileHandler))

	addr := ":" + *port
	log.Printf("Server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
