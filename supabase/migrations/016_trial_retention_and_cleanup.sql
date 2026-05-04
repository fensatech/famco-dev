ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS billing_trial_started_at TIMESTAMPTZ;

UPDATE profiles
SET billing_trial_started_at = created_at
WHERE billing_trial_started_at IS NULL;

CREATE TABLE IF NOT EXISTS trial_retention_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL UNIQUE,
  trial_started_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_reason TEXT
    CHECK (deleted_reason IN ('user_deleted', 'expired_unpaid', 'manual_cleanup') OR deleted_reason IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
