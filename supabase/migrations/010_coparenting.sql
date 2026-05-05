CREATE TABLE IF NOT EXISTS coparenting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  exchange_time TIME,
  exchange_location TEXT,
  parent_a_name TEXT NOT NULL DEFAULT 'Parent A',
  parent_b_name TEXT NOT NULL DEFAULT 'Parent B',
  kid_ids JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coparenting_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES coparenting_schedules(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('a', 'b')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, override_date)
);
