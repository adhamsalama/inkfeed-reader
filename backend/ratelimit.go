package main

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"
)

var (
	rateLimitMu     sync.Mutex
	rateLimitHits   map[string][]time.Time
	rateLimitMax    int
	rateLimitWindow time.Duration
)

func init() {
	rateLimitHits = make(map[string][]time.Time)

	rateLimitMax = 40
	if v := os.Getenv("RATE_LIMIT_MAX"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			rateLimitMax = n
		}
	}

	rateLimitWindow = time.Minute
	if v := os.Getenv("RATE_LIMIT_WINDOW_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			rateLimitWindow = time.Duration(n) * time.Second
		}
	}
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("True-Client-IP")
		if ip == "" {
			ip, _, _ = net.SplitHostPort(r.RemoteAddr)
			if ip == "" {
				ip = r.RemoteAddr
			}
		}

		rateLimitMu.Lock()
		now := time.Now()
		cutoff := now.Add(-rateLimitWindow)
		hits := rateLimitHits[ip]
		filtered := hits[:0]
		for _, t := range hits {
			if t.After(cutoff) {
				filtered = append(filtered, t)
			}
		}
		rateLimitHits[ip] = filtered
		if len(filtered) >= rateLimitMax {
			rateLimitMu.Unlock()
			jsonError(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		rateLimitHits[ip] = append(filtered, now)
		rateLimitMu.Unlock()

		next.ServeHTTP(w, r)
	})
}
