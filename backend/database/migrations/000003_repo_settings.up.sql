-- Per-repo visibility and hidden flag. Hidden repos are excluded from
-- GET /api/events. Aggregates still count their events.

CREATE TABLE IF NOT EXISTS repo_settings (
    full_name TEXT PRIMARY KEY,
    visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private', 'internal')),
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
