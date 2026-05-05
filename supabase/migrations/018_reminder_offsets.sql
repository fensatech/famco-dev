ALTER TABLE events
  ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER;
