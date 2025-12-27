-- Rollback initial schema

DROP INDEX IF EXISTS idx_events_type_created;
DROP INDEX IF EXISTS idx_events_created_at;
DROP INDEX IF EXISTS idx_events_event_type;
DROP TABLE IF EXISTS events;
