# Build stage
FROM golang:1.26-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -extldflags "-static"' \
    -o /build/heimdall-backend .

# Build the migration tool
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s' \
    -o /build/migrate ./cmd/migrate

# Final stage - minimal image
FROM alpine:3.22

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S heimdall && \
    adduser -u 1001 -S heimdall -G heimdall

WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/heimdall-backend .

# Copy migration binary and SQL files
COPY --from=builder /build/migrate ./migrate
COPY --from=builder /build/database/migrations ./database/migrations

# Set ownership
RUN chown -R heimdall:heimdall /app

# Switch to non-root user
USER heimdall

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Run the binary
CMD ["./heimdall-backend"]
