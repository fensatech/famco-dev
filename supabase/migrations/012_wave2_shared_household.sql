ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS household_root_id TEXT;

UPDATE profiles
SET household_root_id = id
WHERE household_root_id IS NULL;

CREATE INDEX IF NOT EXISTS profiles_household_root_idx
  ON profiles (household_root_id);

CREATE TABLE IF NOT EXISTS scanned_event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'handled')),
  assigned_to TEXT,
  last_action TEXT
    CHECK (last_action IN ('calendar', 'task', 'reminder', 'handled') OR last_action IS NULL),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, scanned_event_id)
);

CREATE INDEX IF NOT EXISTS scanned_event_actions_profile_idx
  ON scanned_event_actions (profile_id, status, updated_at DESC);
