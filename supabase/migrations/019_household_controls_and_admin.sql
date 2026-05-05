CREATE TABLE IF NOT EXISTS household_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  browser_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  default_event_offset_minutes INTEGER NOT NULL DEFAULT 0,
  default_task_offset_minutes INTEGER NOT NULL DEFAULT 0,
  default_school_offset_minutes INTEGER NOT NULL DEFAULT 1440,
  default_bill_offset_minutes INTEGER NOT NULL DEFAULT 1440,
  default_coparenting_offset_minutes INTEGER NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scanned_event_actions
  ADD COLUMN IF NOT EXISTS corrected_member_name TEXT,
  ADD COLUMN IF NOT EXISTS corrected_member_type TEXT,
  ADD COLUMN IF NOT EXISTS corrected_event_type TEXT,
  ADD COLUMN IF NOT EXISTS relevance TEXT NOT NULL DEFAULT 'relevant';

ALTER TABLE scanned_event_actions
  DROP CONSTRAINT IF EXISTS scanned_event_actions_corrected_member_type_check;
ALTER TABLE scanned_event_actions
  ADD CONSTRAINT scanned_event_actions_corrected_member_type_check
    CHECK (corrected_member_type IN ('adult', 'child', 'pet', 'family') OR corrected_member_type IS NULL);

ALTER TABLE scanned_event_actions
  DROP CONSTRAINT IF EXISTS scanned_event_actions_corrected_event_type_check;
ALTER TABLE scanned_event_actions
  ADD CONSTRAINT scanned_event_actions_corrected_event_type_check
    CHECK (
      corrected_event_type IN (
        'calendar_invite','appointment','school_event','medical','field_trip',
        'no_school','special_day','activity','recital','subscription','invoice','bill','other'
      )
      OR corrected_event_type IS NULL
    );

ALTER TABLE scanned_event_actions
  DROP CONSTRAINT IF EXISTS scanned_event_actions_relevance_check;
ALTER TABLE scanned_event_actions
  ADD CONSTRAINT scanned_event_actions_relevance_check
    CHECK (relevance IN ('relevant', 'not_relevant', 'needs_review'));

CREATE INDEX IF NOT EXISTS scanned_event_actions_profile_idx
  ON scanned_event_actions (profile_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS coparenting_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES coparenting_schedules(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_by TEXT NOT NULL CHECK (requested_by IN ('a', 'b')),
  requested_to TEXT NOT NULL CHECK (requested_to IN ('a', 'b')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  note TEXT,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coparenting_swap_requests_profile_idx
  ON coparenting_swap_requests (profile_id, status, requested_date DESC);
