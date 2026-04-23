CREATE TABLE IF NOT EXISTS family_facts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        TEXT        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject           TEXT        NOT NULL,  -- person name or institution name
  subject_type      TEXT        NOT NULL,  -- 'kid' | 'parent' | 'family' | 'institution'
  predicate         TEXT        NOT NULL,  -- see taxonomy in lib/facts.ts
  object            TEXT        NOT NULL,  -- the value
  confidence        FLOAT       NOT NULL DEFAULT 0.5,
  evidence_count    INT         NOT NULL DEFAULT 1,
  source_email_ids  TEXT[]      NOT NULL DEFAULT '{}',
  status            TEXT        NOT NULL DEFAULT 'confirmed', -- 'confirmed' | 'uncertain' | 'conflicted'
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_confirmed    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, subject, predicate, object)
);

CREATE INDEX IF NOT EXISTS family_facts_profile       ON family_facts(profile_id);
CREATE INDEX IF NOT EXISTS family_facts_subject       ON family_facts(profile_id, subject, predicate);
CREATE INDEX IF NOT EXISTS family_facts_status        ON family_facts(profile_id, status);
CREATE INDEX IF NOT EXISTS family_facts_institution   ON family_facts(profile_id, subject_type, predicate);
