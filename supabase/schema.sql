-- FAMCO — Family Command Center
-- Run this in Azure Data Studio or psql against your Azure PostgreSQL database

CREATE TABLE IF NOT EXISTS profiles (
  id                   TEXT PRIMARY KEY,           -- "{provider}:{providerAccountId}"
  email                TEXT NOT NULL,
  first_name           TEXT,
  last_name            TEXT,
  city                 TEXT,
  timezone             TEXT,
  phone                TEXT,
  family_type          TEXT CHECK (family_type IN
                         ('single_parent','co_parent','full_household','blended')),
  co_parent_email      TEXT,
  partner_name         TEXT,
  onboarding_step      INT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  dob         DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kid_id        UUID REFERENCES kids(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
