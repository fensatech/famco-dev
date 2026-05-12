ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS last_action TEXT;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_member_name TEXT;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_member_type TEXT;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_event_type TEXT;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS relevance TEXT NOT NULL DEFAULT 'relevant';
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE scanned_event_actions DROP CONSTRAINT IF EXISTS scanned_event_actions_corrected_member_type_check;
ALTER TABLE scanned_event_actions ADD CONSTRAINT scanned_event_actions_corrected_member_type_check
  CHECK (corrected_member_type IN ('adult', 'child', 'pet', 'family') OR corrected_member_type IS NULL);

ALTER TABLE scanned_event_actions DROP CONSTRAINT IF EXISTS scanned_event_actions_relevance_check;
ALTER TABLE scanned_event_actions ADD CONSTRAINT scanned_event_actions_relevance_check
  CHECK (relevance IN ('relevant', 'not_relevant', 'needs_review'));
