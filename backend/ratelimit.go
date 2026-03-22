package main

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	rateLimitMu     sync.Mutex
	rateLimitHits   map[string][]time.Time
	rateLimitMax    int
	rateLimitWindow time.Duration

	emailRateLimitMu   sync.Mutex
	emailRateLimitHits map[string]time.Time

	signupRateLimitMu   sync.Mutex
	signupRateLimitHits map[string]time.Time

	signinRateLimitMu   sync.Mutex
	signinRateLimitHits map[string][]time.Time
)

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.Index(xff, ","); i != -1 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" {
		return r.RemoteAddr
	}
	return ip
}

func init() {
	rateLimitHits = make(map[string][]time.Time)
	emailRateLimitHits = make(map[string]time.Time)
	signupRateLimitHits = make(map[string]time.Time)
	signinRateLimitHits = make(map[string][]time.Time)

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

func emailRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)

		emailRateLimitMu.Lock()
		last, seen := emailRateLimitHits[ip]
		if seen && time.Since(last) < time.Minute {
			emailRateLimitMu.Unlock()
			jsonError(w, "email rate limit exceeded: 1 per minute", http.StatusTooManyRequests)
			return
		}
		emailRateLimitHits[ip] = time.Now()
		emailRateLimitMu.Unlock()

		next.ServeHTTP(w, r)
	})
}

func signupRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)

		signupRateLimitMu.Lock()
		last, seen := signupRateLimitHits[ip]
		if seen && time.Since(last) < time.Minute {
			signupRateLimitMu.Unlock()
			jsonError(w, "rate limit exceeded: 1 signup per minute", http.StatusTooManyRequests)
			return
		}
		signupRateLimitHits[ip] = time.Now()
		signupRateLimitMu.Unlock()

		next.ServeHTTP(w, r)
	})
}

func signinRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)

		signinRateLimitMu.Lock()
		now := time.Now()
		cutoff := now.Add(-time.Minute)
		hits := signinRateLimitHits[ip]
		filtered := hits[:0]
		for _, t := range hits {
			if t.After(cutoff) {
				filtered = append(filtered, t)
			}
		}
		signinRateLimitHits[ip] = filtered
		if len(filtered) >= 5 {
			signinRateLimitMu.Unlock()
			jsonError(w, "rate limit exceeded: 5 signin attempts per minute", http.StatusTooManyRequests)
			return
		}
		signinRateLimitHits[ip] = append(filtered, now)
		signinRateLimitMu.Unlock()

		next.ServeHTTP(w, r)
	})
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)

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
