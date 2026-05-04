ALTER TABLE scanned_events
  ADD COLUMN IF NOT EXISTS related_member_name TEXT,
  ADD COLUMN IF NOT EXISTS related_member_type TEXT;

ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_related_member_type_check;
ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_related_member_type_check
  CHECK (related_member_type IN ('adult', 'child', 'pet', 'family') OR related_member_type IS NULL);
