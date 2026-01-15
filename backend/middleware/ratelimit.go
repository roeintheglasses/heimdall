package middleware

import (
	"net/http"
	"sort"
	"strconv"
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
				ip   string
				time time.Time
			}
			items := make([]ipTime, 0, len(rl.visitors))
			for ip, v := range rl.visitors {
				items = append(items, ipTime{ip, v.lastSeen})
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

// getClientIP extracts the client IP from the request
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies/load balancers)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		for i := 0; i < len(xff); i++ {
			if xff[i] == ',' {
				return xff[:i]
			}
		}
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	// Strip port if present
	addr := r.RemoteAddr
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			return addr[:i]
		}
	}
	return addr
}
