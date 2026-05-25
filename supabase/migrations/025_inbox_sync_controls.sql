ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_inbox_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_manual_inbox_scan_at TIMESTAMPTZ;
