package logger

import (
	"context"
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
)

type contextKey string

const (
	RequestIDKey contextKey = "request_id"
	LoggerKey    contextKey = "logger"
)

// Logger wraps zerolog with additional context methods
type Logger struct {
	log zerolog.Logger
}

// New creates a new Logger instance
func New(pretty bool) *Logger {
	var output io.Writer = os.Stdout

	if pretty {
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
	}

	log := zerolog.New(output).
		With().
		Timestamp().
		Caller().
		Logger()

	return &Logger{log: log}
}

// WithRequestID returns a new logger with request ID in context
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		log: l.log.With().Str("request_id", requestID).Logger(),
	}
}

// WithField returns a new logger with an additional field
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		log: l.log.With().Interface(key, value).Logger(),
	}
}

// WithFields returns a new logger with additional fields
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	ctx := l.log.With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	return &Logger{log: ctx.Logger()}
}

// Info logs an info level message
func (l *Logger) Info() *zerolog.Event {
	return l.log.Info()
}

// Error logs an error level message
func (l *Logger) Error() *zerolog.Event {
	return l.log.Error()
}

// Warn logs a warning level message
func (l *Logger) Warn() *zerolog.Event {
	return l.log.Warn()
}

// Debug logs a debug level message
func (l *Logger) Debug() *zerolog.Event {
	return l.log.Debug()
}

// Fatal logs a fatal level message and exits
func (l *Logger) Fatal() *zerolog.Event {
	return l.log.Fatal()
}

// FromContext retrieves logger from context
func FromContext(ctx context.Context) *Logger {
	if l, ok := ctx.Value(LoggerKey).(*Logger); ok {
		return l
	}
	return New(false)
}

// WithContext adds logger to context
func (l *Logger) WithContext(ctx context.Context) context.Context {
	return context.WithValue(ctx, LoggerKey, l)
}

// RequestIDFromContext retrieves request ID from context
func RequestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(RequestIDKey).(string); ok {
		return id
	}
	return ""
}
