-- Migration: Add AI extraction fields to scanned_events
-- Run against Azure PostgreSQL flexible server

ALTER TABLE scanned_events
  ADD COLUMN IF NOT EXISTS start_time            TIME,
  ADD COLUMN IF NOT EXISTS end_time              TIME,
  ADD COLUMN IF NOT EXISTS kid_name              TEXT,
  ADD COLUMN IF NOT EXISTS grade                 TEXT,
  ADD COLUMN IF NOT EXISTS school_name           TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions  TEXT,
  ADD COLUMN IF NOT EXISTS urgency               TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS auto_add_to_calendar  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS calendar_title        TEXT,
  ADD COLUMN IF NOT EXISTS ai_processed          BOOLEAN NOT NULL DEFAULT FALSE;

-- Widen event_type check to include new AI-detected types
ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_event_type_check;
ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_event_type_check
  CHECK (event_type IN ('calendar_invite','appointment','school_event','medical','field_trip','no_school','special_day','other'));

-- Add urgency check constraint
ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_urgency_check;
ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_urgency_check
  CHECK (urgency IN ('high','normal','low'));
