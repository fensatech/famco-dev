ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assignee_name TEXT,
  ADD COLUMN IF NOT EXISTS recurrence TEXT
    CHECK (recurrence IN ('daily', 'weekly', 'monthly') OR recurrence IS NULL);

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invited_name TEXT,
  relation TEXT NOT NULL DEFAULT 'family_member'
    CHECK (relation IN ('partner', 'co_parent', 'family_member', 'caregiver')),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'adult', 'co_parent')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_invites_profile_idx
  ON family_invites (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS family_invites_email_idx
  ON family_invites (LOWER(invitee_email), status);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('task', 'event', 'scanned_event', 'manual')),
  source_id TEXT,
  title TEXT NOT NULL,
  note TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (profile_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS reminders_profile_idx
  ON reminders (profile_id, status, remind_at ASC);
