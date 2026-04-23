-- Spouse information
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS spouse_first_name TEXT,
  ADD COLUMN IF NOT EXISTS spouse_last_name  TEXT,
  ADD COLUMN IF NOT EXISTS spouse_phone      TEXT,
  ADD COLUMN IF NOT EXISTS spouse_email      TEXT;

-- Full address (city already exists)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address_street   TEXT,
  ADD COLUMN IF NOT EXISTS address_province TEXT,
  ADD COLUMN IF NOT EXISTS address_postal   TEXT,
  ADD COLUMN IF NOT EXISTS address_country  TEXT;

-- Work details for primary and spouse
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_type         TEXT,  -- 'wfh' | 'office' | 'hybrid'
  ADD COLUMN IF NOT EXISTS work_address      TEXT,
  ADD COLUMN IF NOT EXISTS spouse_work_type  TEXT,
  ADD COLUMN IF NOT EXISTS spouse_work_address TEXT;
