-- Initial schema for Heimdall Dashboard
-- Creates the main events table for storing dashboard events

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on event_type for faster queries
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);

-- Create an index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events (event_type, created_at DESC);
