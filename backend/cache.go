package main

import (
	"bytes"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/adhamsalama/inkfeed-backend/db"
)

type cacheEntry struct {
	body        []byte
	contentType string
	expiresAt   time.Time
}

type responseCache struct {
	mu      sync.Mutex
	entries map[string]cacheEntry
}

var globalCache = &responseCache{entries: make(map[string]cacheEntry)}

// cached wraps a handler with a 5-minute in-memory cache keyed by the full request URL.
func cached(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.String()

		globalCache.mu.Lock()
		entry, ok := globalCache.entries[key]
		if ok && time.Now().Before(entry.expiresAt) {
			globalCache.mu.Unlock()
			w.Header().Set("Content-Type", entry.contentType)
			w.Header().Set("Cache-Control", "public, max-age=300")
			w.Write(entry.body)
			return
		}
		globalCache.mu.Unlock()

		rec := &responseRecorder{header: make(http.Header)}
		next.ServeHTTP(rec, r)

		if rec.status == 0 || rec.status == http.StatusOK {
			globalCache.mu.Lock()
			globalCache.entries[key] = cacheEntry{
				body:        rec.body.Bytes(),
				contentType: rec.header.Get("Content-Type"),
				expiresAt:   time.Now().Add(5 * time.Minute),
			}
			globalCache.mu.Unlock()
		}

		for k, vals := range rec.header {
			for _, v := range vals {
				w.Header().Set(k, v)
			}
		}
		if rec.status != 0 {
			w.WriteHeader(rec.status)
		}
		w.Write(rec.body.Bytes())
	}
}

// persistentCached wraps a handler with a two-level cache:
// in-memory (5 min) backed by SQLite (ttl).
func persistentCached(next http.HandlerFunc, ttl time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := r.URL.String()

		// 1. In-memory cache
		globalCache.mu.Lock()
		entry, ok := globalCache.entries[key]
		if ok && time.Now().Before(entry.expiresAt) {
			globalCache.mu.Unlock()
			log.Printf("cache hit (memory): %s", key)
			w.Header().Set("Content-Type", entry.contentType)
			w.Header().Set("Cache-Control", "public, max-age=300")
			w.Write(entry.body)
			return
		}
		globalCache.mu.Unlock()

		// 2. SQLite cache
		row, err := queries.GetPersistentCache(r.Context(), key)
		if err == nil {
			log.Printf("cache hit (sqlite): %s", key)
			body := []byte(row.Body)
			globalCache.mu.Lock()
			globalCache.entries[key] = cacheEntry{
				body:        body,
				contentType: row.ContentType,
				expiresAt:   time.Now().Add(5 * time.Minute),
			}
			globalCache.mu.Unlock()
			w.Header().Set("Content-Type", row.ContentType)
			w.Header().Set("Cache-Control", "public, max-age=300")
			w.Write(body)
			return
		}

		// 3. Fetch from origin
		log.Printf("cache miss: %s", key)
		rec := &responseRecorder{header: make(http.Header)}
		next.ServeHTTP(rec, r)

		if rec.status == 0 || rec.status == http.StatusOK {
			body := rec.body.Bytes()
			contentType := rec.header.Get("Content-Type")
			expires := time.Now().Add(ttl)

			globalCache.mu.Lock()
			globalCache.entries[key] = cacheEntry{
				body:        body,
				contentType: contentType,
				expiresAt:   time.Now().Add(5 * time.Minute),
			}
			globalCache.mu.Unlock()

			if err := queries.SetPersistentCache(r.Context(), db.SetPersistentCacheParams{
				Key:         key,
				Body:        string(body),
				ContentType: contentType,
				ExpiresAt:   expires,
			}); err != nil {
				log.Printf("persistent cache write error: %v", err)
			}
		}

		for k, vals := range rec.header {
			for _, v := range vals {
				w.Header().Set(k, v)
			}
		}
		if rec.status != 0 {
			w.WriteHeader(rec.status)
		}
		w.Write(rec.body.Bytes())
	}
}

type responseRecorder struct {
	header http.Header
	body   bytes.Buffer
	status int
}

func (r *responseRecorder) Header() http.Header        { return r.header }
func (r *responseRecorder) WriteHeader(status int)     { r.status = status }
func (r *responseRecorder) Write(b []byte) (int, error) { return r.body.Write(b) }
