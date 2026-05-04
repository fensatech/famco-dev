CREATE TABLE IF NOT EXISTS family_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  byte_size BIGINT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN ('school','medical','insurance','id','household','pet','finance','other')),
  member_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS family_documents_profile_idx
  ON family_documents (profile_id, category, created_at DESC);
