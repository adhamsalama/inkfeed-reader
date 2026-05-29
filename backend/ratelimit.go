package main

import (
	"context"
	"database/sql"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/adhamsalama/inkfeed-backend/db"
)

var (
	rateLimitMu     sync.Mutex
	rateLimitHits   map[string][]time.Time
	rateLimitMax    int
	rateLimitWindow time.Duration

	emailRateLimitMu   sync.Mutex
	emailRateLimitHits map[string]time.Time

	signinRateLimitMu  sync.Mutex
	signupRateLimitMu  sync.Mutex

	signinRateLimitMax    int
	signupRateLimitMax    int
	authRateLimitWindow   time.Duration
	authRateLimitBlock    time.Duration
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

	signinRateLimitMax = 10
	if v := os.Getenv("SIGNIN_RATE_LIMIT_MAX"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			signinRateLimitMax = n
		}
	}

	signupRateLimitMax = 1000
	if v := os.Getenv("SIGNUP_RATE_LIMIT_MAX"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			signupRateLimitMax = n
		}
	}

	authRateLimitWindow = time.Hour
	if v := os.Getenv("AUTH_RATE_LIMIT_WINDOW_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			authRateLimitWindow = time.Duration(n) * time.Hour
		}
	}

	authRateLimitBlock = 2 * time.Hour
	if v := os.Getenv("AUTH_RATE_LIMIT_BLOCK_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			authRateLimitBlock = time.Duration(n) * time.Hour
		}
	}
}

// dbRateLimit checks and updates a persistent rate limit for the given IP and endpoint.
// Returns true if the request is allowed, false if it should be blocked.
// limit is the max requests allowed in window. blockDuration is how long to block after exceeding.
func dbRateLimit(ctx context.Context, mu *sync.Mutex, ip, endpoint string, limit int, window, blockDuration time.Duration) bool {
	mu.Lock()
	defer mu.Unlock()

	now := time.Now()

	row, err := queries.GetIPRateLimit(ctx, db.GetIPRateLimitParams{Ip: ip, Endpoint: endpoint})
	if err == sql.ErrNoRows {
		queries.UpsertIPRateLimit(ctx, db.UpsertIPRateLimitParams{
			Ip:           ip,
			Endpoint:     endpoint,
			Count:        1,
			WindowStart:  now,
			BlockedUntil: sql.NullTime{},
		})
		return true
	}
	if err != nil {
		return true
	}

	if row.BlockedUntil.Valid && now.Before(row.BlockedUntil.Time) {
		return false
	}

	var count int64
	var windowStart time.Time
	if !row.BlockedUntil.Valid || now.After(row.BlockedUntil.Time) {
		if now.Sub(row.WindowStart) > window {
			count = 1
			windowStart = now
		} else {
			count = row.Count + 1
			windowStart = row.WindowStart
		}
	}

	if count > int64(limit) {
		queries.UpsertIPRateLimit(ctx, db.UpsertIPRateLimitParams{
			Ip:           ip,
			Endpoint:     endpoint,
			Count:        count,
			WindowStart:  windowStart,
			BlockedUntil: sql.NullTime{Time: now.Add(blockDuration), Valid: true},
		})
		return false
	}

	queries.UpsertIPRateLimit(ctx, db.UpsertIPRateLimitParams{
		Ip:           ip,
		Endpoint:     endpoint,
		Count:        count,
		WindowStart:  windowStart,
		BlockedUntil: sql.NullTime{},
	})
	return true
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
		if !dbRateLimit(r.Context(), &signupRateLimitMu, ip, "signup", signupRateLimitMax, authRateLimitWindow, authRateLimitBlock) {
			jsonError(w, "rate limit exceeded: too many signup attempts", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func signinRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		if !dbRateLimit(r.Context(), &signinRateLimitMu, ip, "signin", signinRateLimitMax, authRateLimitWindow, authRateLimitBlock) {
			jsonError(w, "rate limit exceeded: too many signin attempts", http.StatusTooManyRequests)
			return
		}
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
