DROP INDEX IF EXISTS idx_events_created_at_id;
DROP INDEX IF EXISTS idx_events_delivery_id;
ALTER TABLE events DROP COLUMN IF EXISTS is_private;
ALTER TABLE events DROP COLUMN IF EXISTS delivery_id;
