ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS spouse_first_name TEXT,
  ADD COLUMN IF NOT EXISTS spouse_last_name TEXT,
  ADD COLUMN IF NOT EXISTS spouse_phone TEXT,
  ADD COLUMN IF NOT EXISTS spouse_email TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_province TEXT,
  ADD COLUMN IF NOT EXISTS address_postal TEXT,
  ADD COLUMN IF NOT EXISTS address_country TEXT,
  ADD COLUMN IF NOT EXISTS work_type TEXT,
  ADD COLUMN IF NOT EXISTS work_address TEXT,
  ADD COLUMN IF NOT EXISTS spouse_work_type TEXT,
  ADD COLUMN IF NOT EXISTS spouse_work_address TEXT;
