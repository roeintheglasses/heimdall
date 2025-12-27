package config

import (
	"fmt"
	"os"
)

// Config holds application configuration
type Config struct {
	DatabaseURL string
	Port        string
	Version     string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		Version:     "1.0.3",
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	return cfg, nil
}

// LoadWithDefaults reads configuration with fallback defaults (for local development)
func LoadWithDefaults() *Config {
	cfg := &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		Version:     "1.0.3",
	}

	if cfg.DatabaseURL == "" {
		cfg.DatabaseURL = "postgres://heimdall_user:heimdall_password@localhost:5432/heimdall?sslmode=disable"
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	return cfg
}
