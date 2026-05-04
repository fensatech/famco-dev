ALTER TABLE trial_retention_records
  ADD COLUMN IF NOT EXISTS deletion_feedback_category TEXT
  CHECK (
    deletion_feedback_category IN (
      'too_expensive',
      'not_useful',
      'missing_features',
      'too_many_bugs',
      'privacy_concern',
      'switching_tools',
      'other'
    )
    OR deletion_feedback_category IS NULL
  );
