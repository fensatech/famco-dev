-- Migration: Add subscription/activity/bill fields to scanned_events

ALTER TABLE scanned_events
  ADD COLUMN IF NOT EXISTS vendor    TEXT,
  ADD COLUMN IF NOT EXISTS amount    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS recurrence TEXT;

-- Widen event_type check to include new categories
ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_event_type_check;
ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_event_type_check
  CHECK (event_type IN (
    'calendar_invite','appointment','school_event','medical',
    'field_trip','no_school','special_day',
    'activity','recital','subscription','bill','other'
  ));

-- Add recurrence check
ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_recurrence_check;
ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_recurrence_check
  CHECK (recurrence IN ('monthly','annual','weekly','one_time') OR recurrence IS NULL);
