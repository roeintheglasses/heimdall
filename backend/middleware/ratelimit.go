package middleware

import (
	"net"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// MaxVisitors is the maximum number of tracked IPs before aggressive cleanup
const MaxVisitors = 10000

// RateLimiter implements a per-IP rate limiter using token bucket algorithm
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rps      rate.Limit
	burst    int
	cleanup  time.Duration
	// overflow is shared by all new IPs seen while the visitor map is full.
	overflow *rate.Limiter
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// NewRateLimiter creates a new rate limiter with the specified requests per second and burst size
func NewRateLimiter(rps float64, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rps:      rate.Limit(rps),
		burst:    burst,
		cleanup:  3 * time.Minute,
		overflow: rate.NewLimiter(rate.Limit(rps), burst),
	}

	// Start cleanup goroutine to remove stale visitors
	go rl.cleanupVisitors()

	return rl
}

// getVisitor retrieves or creates a rate limiter for the given IP
func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		if len(rl.visitors) >= MaxVisitors {
			return rl.overflow
		}
		limiter := rate.NewLimiter(rl.rps, rl.burst)
		rl.visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

// cleanupVisitors removes visitors that haven't been seen recently
// Also enforces MaxVisitors limit to prevent unbounded memory growth
func (rl *RateLimiter) cleanupVisitors() {
	for {
		time.Sleep(time.Minute)

		rl.mu.Lock()

		// If over limit, aggressively clean up oldest half
		if len(rl.visitors) > MaxVisitors {
			// Sort visitors by lastSeen
			type ipTime struct {
				time time.Time
				ip   string
			}
			items := make([]ipTime, 0, len(rl.visitors))
			for ip, v := range rl.visitors {
				items = append(items, ipTime{v.lastSeen, ip})
			}
			sort.Slice(items, func(i, j int) bool {
				return items[i].time.Before(items[j].time)
			})
			// Remove oldest half
			for i := 0; i < len(items)/2; i++ {
				delete(rl.visitors, items[i].ip)
			}
		} else {
			// Normal cleanup - remove stale visitors
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > rl.cleanup {
					delete(rl.visitors, ip)
				}
			}
		}

		rl.mu.Unlock()
	}
}

// Limit is the middleware that enforces rate limiting
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get client IP
		ip := getClientIP(r)

		limiter := rl.getVisitor(ip)

		// Set rate limit headers
		w.Header().Set("X-RateLimit-Limit", strconv.FormatFloat(float64(rl.rps), 'f', 0, 64))
		w.Header().Set("X-RateLimit-Burst", strconv.Itoa(rl.burst))

		if !limiter.Allow() {
			// Calculate retry after
			reservation := limiter.Reserve()
			delay := reservation.Delay()
			reservation.Cancel()

			w.Header().Set("Retry-After", strconv.Itoa(int(delay.Seconds())+1))
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		// Set remaining tokens (approximate)
		tokens := limiter.Tokens()
		w.Header().Set("X-RateLimit-Remaining", strconv.FormatFloat(tokens, 'f', 0, 64))

		next.ServeHTTP(w, r)
	})
}

// getClientIP extracts the client IP from the request.
// The rightmost non-empty hop of the last X-Forwarded-For header line is the one
// appended by the trusted proxy in front of the service; earlier hops and
// earlier header lines are client controlled.
func getClientIP(r *http.Request) string {
	if lines := r.Header.Values("X-Forwarded-For"); len(lines) > 0 {
		parts := strings.Split(lines[len(lines)-1], ",")
		for i := len(parts) - 1; i >= 0; i-- {
			if ip := strings.TrimSpace(parts[i]); ip != "" {
				return ip
			}
		}
	}

	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}
