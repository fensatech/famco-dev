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

CREATE TABLE IF NOT EXISTS scanned_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gmail_message_id  TEXT NOT NULL,
  title             TEXT NOT NULL,
  event_date        TIMESTAMPTZ,
  event_type        TEXT NOT NULL DEFAULT 'other'
                      CHECK (event_type IN ('calendar_invite','appointment','school_event','medical','other')),
  organization_name TEXT,
  organization_type TEXT
                      CHECK (organization_type IN ('school','medical_clinic','dental','sports','pharmacy') OR organization_type IS NULL),
  source_from       TEXT,
  snippet           TEXT,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, gmail_message_id)
);

CREATE TABLE IF NOT EXISTS scanned_organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,
  email_domain TEXT NOT NULL,
  scanned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, email_domain)
);

CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  event_date  DATE NOT NULL,
  start_time  TIME,
  end_time    TIME,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  due_date     DATE,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
