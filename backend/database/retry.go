package database

import (
	"context"
	"database/sql"
	"errors"
	"math/rand"
	"time"

	"github.com/lib/pq"
)

// RetryConfig holds configuration for retry behavior
type RetryConfig struct {
	MaxRetries     int
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
	BackoffFactor  float64
}

// DefaultRetryConfig provides sensible defaults for Neon/serverless Postgres
var DefaultRetryConfig = RetryConfig{
	MaxRetries:     3,
	InitialBackoff: 100 * time.Millisecond,
	MaxBackoff:     2 * time.Second,
	BackoffFactor:  2.0,
}

// isRetryableError checks if an error is likely transient and worth retrying
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Check for connection-related errors
	if errors.Is(err, sql.ErrConnDone) {
		return true
	}

	// Check for PostgreSQL-specific errors
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		// Connection errors, admin shutdown, crash shutdown, cannot connect now
		switch pqErr.Code {
		case "08000", "08003", "08006", "08001", "08004", "08007", "08P01":
			return true
		case "57P01", "57P02", "57P03": // admin_shutdown, crash_shutdown, cannot_connect_now
			return true
		case "40001", "40P01": // serialization_failure, deadlock_detected
			return true
		}
	}

	// Check for common transient error messages
	errMsg := err.Error()
	transientMessages := []string{
		"connection refused",
		"connection reset",
		"broken pipe",
		"EOF",
		"i/o timeout",
		"no such host",
		"connection timed out",
		"server closed the connection unexpectedly",
		"SSL connection has been closed unexpectedly",
		"driver: bad connection",
	}

	for _, msg := range transientMessages {
		if contains(errMsg, msg) {
			return true
		}
	}

	return false
}

// contains checks if s contains substr (case-insensitive would be better but this is simpler)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// WithRetry executes a function with retry logic
func WithRetry[T any](ctx context.Context, cfg RetryConfig, fn func() (T, error)) (T, error) {
	var result T
	var lastErr error
	backoff := cfg.InitialBackoff

	for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
		result, lastErr = fn()
		if lastErr == nil {
			return result, nil
		}

		if !isRetryableError(lastErr) {
			return result, lastErr
		}

		if attempt == cfg.MaxRetries {
			break
		}

		// Add jitter to avoid thundering herd
		jitter := time.Duration(rand.Int63n(int64(backoff / 4)))
		sleepTime := backoff + jitter

		if sleepTime > cfg.MaxBackoff {
			sleepTime = cfg.MaxBackoff
		}

		select {
		case <-ctx.Done():
			return result, ctx.Err()
		case <-time.After(sleepTime):
		}

		backoff = time.Duration(float64(backoff) * cfg.BackoffFactor)
	}

	return result, lastErr
}

// WithRetryNoResult executes a function with retry logic (for functions with no return value)
func WithRetryNoResult(ctx context.Context, cfg RetryConfig, fn func() error) error {
	_, err := WithRetry(ctx, cfg, func() (struct{}, error) {
		return struct{}{}, fn()
	})
	return err
}
