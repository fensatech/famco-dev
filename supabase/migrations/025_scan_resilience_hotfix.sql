CREATE TABLE IF NOT EXISTS family_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  evidence_count INT NOT NULL DEFAULT 1,
  source_email_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'confirmed',
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_confirmed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, subject, predicate, object)
);

CREATE INDEX IF NOT EXISTS family_facts_profile
  ON family_facts(profile_id);
CREATE INDEX IF NOT EXISTS family_facts_subject
  ON family_facts(profile_id, subject, predicate);
CREATE INDEX IF NOT EXISTS family_facts_status
  ON family_facts(profile_id, status);
CREATE INDEX IF NOT EXISTS family_facts_institution
  ON family_facts(profile_id, subject_type, predicate);

ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS confidence FLOAT NOT NULL DEFAULT 0.5;
ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS evidence_count INT NOT NULL DEFAULT 1;
ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS source_email_ids TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed';
ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE family_facts ADD COLUMN IF NOT EXISTS last_confirmed TIMESTAMPTZ NOT NULL DEFAULT NOW();
