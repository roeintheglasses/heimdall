-- Migration: Add event categorization support
-- Date: 2025-07-24
-- Description: Add category columns to events table and create categories lookup table

-- Add category column to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'development';
ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50) DEFAULT NULL;

-- Create categories lookup table
CREATE TABLE IF NOT EXISTS event_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  priority INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO event_categories (id, name, description, icon, color, priority) VALUES
('development', 'Development', 'Code commits, pushes, and repository changes', 'GitBranch', 'blue', 1),
('deployments', 'Deployments', 'Application deployments and builds', 'Rocket', 'green', 2),
('infrastructure', 'Infrastructure', 'Server and system monitoring', 'Server', 'purple', 3),
('issues', 'Issues & Bugs', 'Error notifications and system issues', 'AlertCircle', 'red', 4),
('security', 'Security', 'Security alerts and vulnerability reports', 'Shield', 'orange', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  priority = EXCLUDED.priority;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_category_created_at ON events(category, created_at DESC);

-- Update existing events with categories based on event_type
UPDATE events SET category = 'development' WHERE event_type LIKE 'github.%' AND category = 'development';
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'vercel.%';
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'railway.%';
UPDATE events SET category = 'issues' WHERE event_type LIKE 'error.%';
UPDATE events SET category = 'security' WHERE event_type LIKE 'security.%';

-- Verify migration
SELECT 'Migration completed successfully. Categories added:' as status;
SELECT category, COUNT(*) as event_count FROM events GROUP BY category ORDER BY event_count DESC;