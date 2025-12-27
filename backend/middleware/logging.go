package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"heimdall-backend/logger"
)

// RequestID middleware injects a unique request ID into the context and response headers
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Add to response headers
		w.Header().Set("X-Request-ID", requestID)

		// Add to context
		ctx := context.WithValue(r.Context(), logger.RequestIDKey, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    int64
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.written += int64(n)
	return n, err
}

// LogRequest middleware logs incoming requests and their responses
func LogRequest(log *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Get or create request ID
			requestID := logger.RequestIDFromContext(r.Context())
			if requestID == "" {
				requestID = "unknown"
			}

			// Create request-scoped logger
			reqLogger := log.WithRequestID(requestID)

			// Add logger to context
			ctx := reqLogger.WithContext(r.Context())
			r = r.WithContext(ctx)

			// Wrap response writer
			wrapped := newResponseWriter(w)

			// Log request start
			reqLogger.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Str("remote_addr", r.RemoteAddr).
				Str("user_agent", r.UserAgent()).
				Msg("request started")

			// Process request
			next.ServeHTTP(wrapped, r)

			// Log request completion
			duration := time.Since(start)
			event := reqLogger.Info()
			if wrapped.statusCode >= 400 {
				event = reqLogger.Warn()
			}
			if wrapped.statusCode >= 500 {
				event = reqLogger.Error()
			}

			event.
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", wrapped.statusCode).
				Int64("bytes", wrapped.written).
				Dur("duration", duration).
				Msg("request completed")
		})
	}
}
