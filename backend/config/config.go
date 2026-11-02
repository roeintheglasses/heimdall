package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	DatabaseURL    string
	Port           string
	Version        string
	RateLimitRPS   float64 // Requests per second for rate limiting
	RateLimitBurst int     // Burst size for rate limiting
	PrettyLogs     bool    // Use pretty console logs (for development)
	WebhookSecret  string  // Shared secret expected in X-Heimdall-Secret (BACKEND_WEBHOOK_SECRET)
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		Port:           os.Getenv("PORT"),
		Version:        "1.0.4",
		RateLimitRPS:   10.0,
		RateLimitBurst: 30,
		PrettyLogs:     os.Getenv("PRETTY_LOGS") == "true",
		WebhookSecret:  os.Getenv("BACKEND_WEBHOOK_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	// Parse rate limit settings from environment
	if rps := os.Getenv("RATE_LIMIT_RPS"); rps != "" {
		if val, err := strconv.ParseFloat(rps, 64); err == nil && val > 0 {
			cfg.RateLimitRPS = val
		}
	}

	if burst := os.Getenv("RATE_LIMIT_BURST"); burst != "" {
		if val, err := strconv.Atoi(burst); err == nil && val > 0 {
			cfg.RateLimitBurst = val
		}
	}

	return cfg, nil
}

// LoadWithDefaults reads configuration with fallback defaults (for local development)
func LoadWithDefaults() *Config {
	cfg := &Config{
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		Port:           os.Getenv("PORT"),
		Version:        "1.0.4",
		RateLimitRPS:   10.0,
		RateLimitBurst: 30,
		PrettyLogs:     os.Getenv("PRETTY_LOGS") != "false", // Default to pretty logs in dev
		WebhookSecret:  os.Getenv("BACKEND_WEBHOOK_SECRET"),
	}

	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = "postgres://heimdall_user:heimdall_password@localhost:5432/heimdall?sslmode=disable"
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	// Parse rate limit settings from environment
	if rps := os.Getenv("RATE_LIMIT_RPS"); rps != "" {
		if val, err := strconv.ParseFloat(rps, 64); err == nil && val > 0 {
			cfg.RateLimitRPS = val
		}
	}

	if burst := os.Getenv("RATE_LIMIT_BURST"); burst != "" {
		if val, err := strconv.Atoi(burst); err == nil && val > 0 {
			cfg.RateLimitBurst = val
		}
	}

	return cfg
}
