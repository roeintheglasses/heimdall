-- Heimdall database schema.
--
-- The files in backend/database/migrations are authoritative. This file mirrors
-- migrations 000001 to 000003 for reading and for one-shot setup of an empty
-- database. It contains no seed rows. Use `go run ./cmd/migrate up` from the
-- backend directory for real deployments.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_id VARCHAR(255),
    is_private BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events (event_type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_delivery_id ON events (delivery_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at_id ON events (created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS repo_settings (
    full_name TEXT PRIMARY KEY,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private', 'internal')),
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
