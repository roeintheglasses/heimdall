-- Delivery id for idempotent inserts, privacy flag, cursor index, and
-- repair of rows stored with millisecond timestamps read as seconds.

ALTER TABLE events ADD COLUMN IF NOT EXISTS delivery_id VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_delivery_id ON events (delivery_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at_id ON events (created_at DESC, id DESC);

UPDATE events SET created_at = to_timestamp(EXTRACT(EPOCH FROM created_at) / 1000)
 WHERE EXTRACT(EPOCH FROM created_at) > 1e11;
