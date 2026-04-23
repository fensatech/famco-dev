ALTER TABLE events
  ADD COLUMN IF NOT EXISTS member_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_events_member ON events(profile_id, member_name);
