-- FAMCO — Family Command Center
-- Run this in Azure Data Studio or psql against your Azure PostgreSQL database

CREATE TABLE IF NOT EXISTS profiles (
  id                   TEXT PRIMARY KEY,           -- "{provider}:{providerAccountId}"
  household_root_id    TEXT,
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
  billing_trial_started_at TIMESTAMPTZ,
  onboarding_step      INT NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trial_retention_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email  TEXT NOT NULL UNIQUE,
  provider          TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL UNIQUE,
  trial_started_at  TIMESTAMPTZ NOT NULL,
  deleted_at        TIMESTAMPTZ,
  deleted_reason    TEXT CHECK (deleted_reason IN ('user_deleted','expired_unpaid','manual_cleanup') OR deleted_reason IS NULL),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kids (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  first_name       TEXT,
  last_name        TEXT,
  dob              DATE,
  school_name      TEXT,
  school_address   TEXT,
  grade            TEXT,
  daycare_name     TEXT,
  daycare_address  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendars (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kid_id        UUID REFERENCES kids(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  content_type  TEXT,
  byte_size     BIGINT NOT NULL,
  category      TEXT NOT NULL
                 CHECK (category IN ('school','medical','insurance','id','household','pet','finance','other')),
  member_name   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scanned_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gmail_message_id      TEXT NOT NULL,
  title                 TEXT NOT NULL,
  event_date            TIMESTAMPTZ,
  start_time            TIME,
  end_time              TIME,
  event_type            TEXT NOT NULL DEFAULT 'other'
                          CHECK (event_type IN ('calendar_invite','appointment','school_event','medical','field_trip','no_school','special_day','activity','recital','subscription','invoice','bill','other')),
  organization_name     TEXT,
  organization_type     TEXT
                          CHECK (organization_type IN ('school','medical_clinic','dental','sports','pharmacy') OR organization_type IS NULL),
  source_from           TEXT,
  snippet               TEXT,
  related_member_name   TEXT,
  related_member_type   TEXT
                          CHECK (related_member_type IN ('adult','child','pet','family') OR related_member_type IS NULL),
  kid_name              TEXT,
  grade                 TEXT,
  school_name           TEXT,
  special_instructions  TEXT,
  urgency               TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('high','normal','low')),
  auto_add_to_calendar  BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_title        TEXT,
  ai_processed          BOOLEAN NOT NULL DEFAULT FALSE,
  vendor                TEXT,
  amount                NUMERIC(10,2),
  recurrence            TEXT CHECK (recurrence IN ('monthly','annual','weekly','one_time') OR recurrence IS NULL),
  scanned_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  due_time     TIME,
  notes        TEXT,
  assignee_name TEXT,
  recurrence   TEXT CHECK (recurrence IN ('daily','weekly','monthly') OR recurrence IS NULL),
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invited_name TEXT,
  relation TEXT NOT NULL DEFAULT 'family_member'
    CHECK (relation IN ('partner', 'co_parent', 'family_member', 'caregiver')),
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'adult', 'co_parent')),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('task', 'event', 'scanned_event', 'manual')),
  source_id TEXT,
  title TEXT NOT NULL,
  note TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (profile_id, source_type, source_id)
);

CREATE TABLE IF NOT EXISTS scanned_event_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scanned_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'handled')),
  assigned_to TEXT,
  last_action TEXT
    CHECK (last_action IN ('calendar', 'task', 'reminder', 'handled') OR last_action IS NULL),
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, scanned_event_id)
);
