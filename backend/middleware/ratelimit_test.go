package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"golang.org/x/time/rate"
)

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name       string
		xff        string
		xri        string
		remoteAddr string
		want       string
	}{
		{"spoofed leftmost ignored", "1.2.3.4, 9.9.9.9", "", "10.0.0.1:1234", "9.9.9.9"},
		{"single hop", "203.0.113.7", "", "10.0.0.1:1234", "203.0.113.7"},
		{"trailing empty entry", "1.1.1.1, 2.2.2.2, ", "", "10.0.0.1:1234", "2.2.2.2"},
		{"whitespace trimmed", "1.1.1.1,   2.2.2.2  ", "", "10.0.0.1:1234", "2.2.2.2"},
		{"x-real-ip ignored", "", "6.6.6.6", "10.0.0.1:1234", "10.0.0.1"},
		{"remote addr without port", "", "", "10.0.0.1", "10.0.0.1"},
		{"ipv6 remote addr", "", "", "[2001:db8::1]:443", "2001:db8::1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", http.NoBody)
			req.RemoteAddr = tt.remoteAddr
			if tt.xff != "" {
				req.Header.Set("X-Forwarded-For", tt.xff)
			}
			if tt.xri != "" {
				req.Header.Set("X-Real-IP", tt.xri)
			}
			if got := getClientIP(req); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestGetVisitor_CapUsesSharedOverflowLimiter(t *testing.T) {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor, MaxVisitors),
		rps:      1,
		burst:    1,
		overflow: rate.NewLimiter(1, 1),
	}
	for i := 0; i < MaxVisitors; i++ {
		rl.visitors["ip-"+strconv.Itoa(i)] = &visitor{limiter: rate.NewLimiter(1, 1), lastSeen: time.Now()}
	}

	a := rl.getVisitor("new-a")
	b := rl.getVisitor("new-b")

	if a != rl.overflow || b != rl.overflow {
		t.Error("new IPs at the cap should share the overflow limiter")
	}
	if len(rl.visitors) != MaxVisitors {
		t.Errorf("map grew past the cap: %d", len(rl.visitors))
	}
	if existing := rl.getVisitor("ip-5"); existing == rl.overflow {
		t.Error("known IPs keep their own limiter")
	}
}

func TestGetClientIP_UsesLastForwardedForHeaderLine(t *testing.T) {
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/", http.NoBody)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Add("X-Forwarded-For", "6.6.6.6")
	req.Header.Add("X-Forwarded-For", "1.1.1.1, 9.9.9.9")
	if got := getClientIP(req); got != "9.9.9.9" {
		t.Errorf("got %q, want 9.9.9.9", got)
	}
}
