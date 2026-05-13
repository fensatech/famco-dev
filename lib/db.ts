import { getPool } from "./supabase"
import { BILLING_GRACE_DAYS, BILLING_TRIAL_DAYS, getTrialWindow, normalizeBillingEmail } from "./billing"
import { normalizeReminderOffsetMinutes } from "./reminders"
import type {
  CoParentingSwapRequest,
  DeletionFeedbackCategory,
  FamilyDocument,
  FamilyFact,
  HouseholdMember,
  HouseholdNotificationPreferences,
  HouseholdRole,
  Kid,
  Profile,
  RawFact,
  ScannedEventAction,
  TrialRetentionReason,
  TrialRetentionRecord,
} from "@/types"
import type { FamilyInvite, Reminder } from "@/types"
import { randomUUID } from "node:crypto"

let schemaEnsured = false
let schemaEnsuring: Promise<void> | null = null
const householdRootCache = new Map<string, string>()

export async function ensureRuntimeSchema() {
  if (schemaEnsured) return
  if (schemaEnsuring) return schemaEnsuring

  const pool = getPool()
  schemaEnsuring = (async () => {
    await pool.query(`
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS first_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS last_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_address TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS grade TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS daycare_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS daycare_address TEXT;

      CREATE TABLE IF NOT EXISTS pets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        animal_type TEXT NOT NULL,
        breed TEXT,
        dob DATE,
        created_at TIMESTAMPTZ DEFAULT now()
      );

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

      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS household_root_id TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_trial_started_at TIMESTAMPTZ;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_first_name TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_last_name TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_phone TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_email TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_province TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_postal TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_type TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_address TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_work_type TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_work_address TEXT;
      UPDATE profiles SET household_root_id = id WHERE household_root_id IS NULL;
      UPDATE profiles SET billing_trial_started_at = created_at WHERE billing_trial_started_at IS NULL;
      CREATE INDEX IF NOT EXISTS profiles_household_root_idx
        ON profiles (household_root_id);

      CREATE TABLE IF NOT EXISTS trial_retention_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        normalized_email TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        provider_profile_id TEXT NOT NULL UNIQUE,
        trial_started_at TIMESTAMPTZ NOT NULL,
        deleted_at TIMESTAMPTZ,
        deleted_reason TEXT
          CHECK (deleted_reason IN ('user_deleted','expired_unpaid','manual_cleanup') OR deleted_reason IS NULL),
        deletion_feedback_category TEXT
          CHECK (deletion_feedback_category IN ('too_expensive','not_useful','missing_features','too_many_bugs','privacy_concern','switching_tools','other') OR deletion_feedback_category IS NULL),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE trial_retention_records
        ADD COLUMN IF NOT EXISTS deletion_feedback_category TEXT;
      ALTER TABLE trial_retention_records DROP CONSTRAINT IF EXISTS trial_retention_records_deletion_feedback_category_check;
      ALTER TABLE trial_retention_records ADD CONSTRAINT trial_retention_records_deletion_feedback_category_check
        CHECK (deletion_feedback_category IN ('too_expensive','not_useful','missing_features','too_many_bugs','privacy_concern','switching_tools','other') OR deletion_feedback_category IS NULL);

      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_name TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER;

      ALTER TABLE scanned_events ADD COLUMN IF NOT EXISTS vendor TEXT;
      ALTER TABLE scanned_events ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
      ALTER TABLE scanned_events ADD COLUMN IF NOT EXISTS recurrence TEXT;
      ALTER TABLE scanned_events ADD COLUMN IF NOT EXISTS related_member_name TEXT;
      ALTER TABLE scanned_events ADD COLUMN IF NOT EXISTS related_member_type TEXT;

      ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_event_type_check;
      ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_event_type_check
        CHECK (event_type IN (
          'calendar_invite','appointment','school_event','medical','field_trip',
          'no_school','special_day','activity','recital','subscription','invoice','bill','other'
        ));
      ALTER TABLE scanned_events DROP CONSTRAINT IF EXISTS scanned_events_related_member_type_check;
      ALTER TABLE scanned_events ADD CONSTRAINT scanned_events_related_member_type_check
        CHECK (related_member_type IN ('adult', 'child', 'pet', 'family') OR related_member_type IS NULL);

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

      CREATE TABLE IF NOT EXISTS family_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        invitee_email TEXT NOT NULL,
        invited_name TEXT,
        relation TEXT NOT NULL DEFAULT 'family_member',
        role TEXT NOT NULL DEFAULT 'member',
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        accepted_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
        accepted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS family_invites_profile_idx
        ON family_invites (profile_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS family_invites_email_idx
        ON family_invites (LOWER(invitee_email), status);

      CREATE TABLE IF NOT EXISTS reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        source_id TEXT,
        title TEXT NOT NULL,
        note TEXT,
        remind_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS reminders_profile_idx
        ON reminders (profile_id, status, remind_at ASC);

      CREATE TABLE IF NOT EXISTS household_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
        browser_enabled BOOLEAN NOT NULL DEFAULT true,
        quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        default_event_offset_minutes INTEGER NOT NULL DEFAULT 0,
        default_task_offset_minutes INTEGER NOT NULL DEFAULT 0,
        default_school_offset_minutes INTEGER NOT NULL DEFAULT 1440,
        default_bill_offset_minutes INTEGER NOT NULL DEFAULT 1440,
        default_coparenting_offset_minutes INTEGER NOT NULL DEFAULT 120,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS google_calendar_preferences (
        profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
        visible BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS google_calendar_event_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        external_event_id TEXT NOT NULL,
        member_name TEXT,
        hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (profile_id, external_event_id)
      );

      CREATE INDEX IF NOT EXISTS google_calendar_event_overrides_profile_idx
        ON google_calendar_event_overrides (profile_id, hidden, updated_at DESC);

      CREATE TABLE IF NOT EXISTS scanned_event_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        scanned_event_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        assigned_to TEXT,
        last_action TEXT,
        corrected_member_name TEXT,
        corrected_member_type TEXT,
        corrected_event_type TEXT,
        relevance TEXT NOT NULL DEFAULT 'relevant',
        handled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (profile_id, scanned_event_id)
      );

      CREATE INDEX IF NOT EXISTS scanned_event_actions_profile_idx
        ON scanned_event_actions (profile_id, status, updated_at DESC);

      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS assigned_to TEXT;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS last_action TEXT;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_member_name TEXT;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_member_type TEXT;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS corrected_event_type TEXT;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS relevance TEXT NOT NULL DEFAULT 'relevant';
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      ALTER TABLE scanned_event_actions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE scanned_event_actions DROP CONSTRAINT IF EXISTS scanned_event_actions_corrected_member_type_check;
      ALTER TABLE scanned_event_actions ADD CONSTRAINT scanned_event_actions_corrected_member_type_check
        CHECK (corrected_member_type IN ('adult', 'child', 'pet', 'family') OR corrected_member_type IS NULL);
      ALTER TABLE scanned_event_actions DROP CONSTRAINT IF EXISTS scanned_event_actions_relevance_check;
      ALTER TABLE scanned_event_actions ADD CONSTRAINT scanned_event_actions_relevance_check
        CHECK (relevance IN ('relevant', 'not_relevant', 'needs_review'));

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

      CREATE TABLE IF NOT EXISTS coparenting_swap_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        schedule_id UUID NOT NULL REFERENCES coparenting_schedules(id) ON DELETE CASCADE,
        requested_date DATE NOT NULL,
        requested_by TEXT NOT NULL CHECK (requested_by IN ('a', 'b')),
        requested_to TEXT NOT NULL CHECK (requested_to IN ('a', 'b')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
        note TEXT,
        decision_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS coparenting_swap_requests_profile_idx
        ON coparenting_swap_requests (profile_id, status, requested_date DESC);

      ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence TEXT;
      ALTER TABLE coparenting_schedules ADD COLUMN IF NOT EXISTS coparent_email TEXT;
    `)

    schemaEnsured = true
  })()

  try {
    await schemaEnsuring
  } finally {
    schemaEnsuring = null
  }
}

async function resolveHouseholdRootId(profileId: string, clientArg?: Queryable): Promise<string> {
  if (householdRootCache.has(profileId)) return householdRootCache.get(profileId) as string
  const pool = getPool()
  const client = clientArg ?? pool
  const result = await client.query(
    `SELECT COALESCE(household_root_id, id) AS household_root_id FROM profiles WHERE id = $1`,
    [profileId],
  )
  const rows = result.rows as { household_root_id: string | null }[]
  const rootId = rows[0]?.household_root_id ?? profileId
  householdRootCache.set(profileId, rootId)
  return rootId
}

function clearHouseholdRootCache(profileId: string) {
  householdRootCache.delete(profileId)
}

export async function createProfile(data: {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  billing_trial_started_at?: string | null
}) {
  const pool = getPool()
  await pool.query(
    `INSERT INTO profiles (id, household_root_id, email, first_name, last_name, billing_trial_started_at)
     VALUES ($1, $1, $2, $3, $4, COALESCE($5::timestamptz, NOW()))
     ON CONFLICT (id) DO UPDATE
     SET household_root_id = COALESCE(profiles.household_root_id, EXCLUDED.household_root_id),
         billing_trial_started_at = COALESCE(profiles.billing_trial_started_at, EXCLUDED.billing_trial_started_at)`,
    [data.id, data.email, data.first_name, data.last_name, data.billing_trial_started_at ?? null]
  )
  householdRootCache.set(data.id, data.id)
}

export async function getProfile(id: string): Promise<Profile | null> {
  const pool = getPool()
  const { rows } = await pool.query<Profile>(
    "SELECT * FROM profiles WHERE id = $1",
    [id]
  )
  return rows[0] ?? null
}

export async function getPrimaryHouseholdProfile(profileId: string): Promise<Profile | null> {
  const profile = await getProfile(profileId)
  if (!profile) return null
  const householdRootId = profile.household_root_id ?? profile.id
  if (householdRootId === profile.id) return profile
  return getProfile(householdRootId)
}

export async function updateHouseholdProfile(profileId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const householdRootId = await resolveHouseholdRootId(profileId)
  await updateProfile(householdRootId, updates)
  return getProfile(householdRootId)
}

export async function getHouseholdRole(profileId: string): Promise<HouseholdRole> {
  const pool = getPool()
  const profile = await getProfile(profileId)
  if (!profile) return "member"
  const householdRootId = profile.household_root_id ?? profile.id
  if (profileId === householdRootId) return "owner"

  const { rows } = await pool.query<{ role: HouseholdRole | null }>(
    `SELECT role
     FROM family_invites
     WHERE profile_id = $1
       AND accepted_by_profile_id = $2
       AND status = 'accepted'
     ORDER BY accepted_at DESC NULLS LAST, created_at DESC
     LIMIT 1`,
    [householdRootId, profileId],
  )

  return rows[0]?.role ?? "member"
}

function mapNotificationPreferences(row: HouseholdNotificationPreferences & {
  created_at: string | Date
  updated_at: string | Date
}): HouseholdNotificationPreferences {
  return {
    ...row,
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function mapScannedEventAction(
  row: ScannedEventAction & {
    handled_at: string | Date | null
    created_at: string | Date
    updated_at: string | Date
  },
): ScannedEventAction {
  return {
    ...row,
    handled_at: row.handled_at ? (isDateValue(row.handled_at) ? row.handled_at.toISOString() : String(row.handled_at)) : null,
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function mapCoParentingSwapRequest(
  row: CoParentingSwapRequest & {
    requested_date: string | Date
    created_at: string | Date
    updated_at: string | Date
  },
): CoParentingSwapRequest {
  return {
    ...row,
    requested_date: isDateValue(row.requested_date) ? row.requested_date.toISOString().slice(0, 10) : String(row.requested_date).slice(0, 10),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

function mapTrialRetentionRecord(row: TrialRetentionRecord & {
  trial_started_at: string | Date
  deleted_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}): TrialRetentionRecord {
  return {
    ...row,
    trial_started_at: isDateValue(row.trial_started_at) ? row.trial_started_at.toISOString() : String(row.trial_started_at),
    deleted_at: row.deleted_at ? (isDateValue(row.deleted_at) ? row.deleted_at.toISOString() : String(row.deleted_at)) : null,
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export async function upsertTrialRetentionRecord(data: {
  email: string
  provider: string
  provider_account_id: string
  provider_profile_id: string
  trial_started_at?: string
}): Promise<TrialRetentionRecord> {
  const pool = getPool()
  const normalizedEmail = normalizeBillingEmail(data.email)
  const trialStartedAt = data.trial_started_at ?? new Date().toISOString()
  const existingResult = await pool.query<TrialRetentionRecord & {
    trial_started_at: string | Date
    deleted_at: string | Date | null
    created_at: string | Date
    updated_at: string | Date
  }>(
    `SELECT * FROM trial_retention_records
     WHERE normalized_email = $1 OR provider_profile_id = $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [normalizedEmail, data.provider_profile_id],
  )
  const existing = existingResult.rows[0]
  if (existing) {
    const { rows } = await pool.query<TrialRetentionRecord & {
      trial_started_at: string | Date
      deleted_at: string | Date | null
      created_at: string | Date
      updated_at: string | Date
    }>(
      `UPDATE trial_retention_records
       SET normalized_email = $2,
           provider = $3,
           provider_account_id = $4,
           provider_profile_id = $5,
           trial_started_at = LEAST(trial_started_at, $6::timestamptz),
           deleted_at = NULL,
           deleted_reason = NULL,
           deletion_feedback_category = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id, normalizedEmail, data.provider, data.provider_account_id, data.provider_profile_id, trialStartedAt],
    )
    return mapTrialRetentionRecord(rows[0])
  }
  const { rows } = await pool.query<TrialRetentionRecord & {
    trial_started_at: string | Date
    deleted_at: string | Date | null
    created_at: string | Date
    updated_at: string | Date
  }>(
    `INSERT INTO trial_retention_records
      (normalized_email, provider, provider_account_id, provider_profile_id, trial_started_at)
     VALUES ($1,$2,$3,$4,$5::timestamptz)
     RETURNING *`,
    [normalizedEmail, data.provider, data.provider_account_id, data.provider_profile_id, trialStartedAt],
  )
  return mapTrialRetentionRecord(rows[0])
}

export async function getTrialRetentionRecordByEmail(email: string): Promise<TrialRetentionRecord | null> {
  const pool = getPool()
  const { rows } = await pool.query<TrialRetentionRecord & {
    trial_started_at: string | Date
    deleted_at: string | Date | null
    created_at: string | Date
    updated_at: string | Date
  }>(
    `SELECT * FROM trial_retention_records WHERE normalized_email = $1`,
    [normalizeBillingEmail(email)],
  )
  if (!rows[0]) return null
  return mapTrialRetentionRecord(rows[0])
}

export async function markTrialRetentionDeleted(
  profileIds: string[],
  reason: TrialRetentionReason,
  feedbackCategory?: DeletionFeedbackCategory | null,
  clientArg?: Queryable,
): Promise<void> {
  if (profileIds.length === 0) return
  const pool = getPool()
  const client = clientArg ?? pool
  await client.query(
    `UPDATE trial_retention_records
     SET deleted_at = NOW(), deleted_reason = $2, deletion_feedback_category = $3, updated_at = NOW()
     WHERE provider_profile_id = ANY($1::text[])`,
    [profileIds, reason, feedbackCategory ?? null],
  )
}

export async function getNotificationPreferences(profileId: string): Promise<HouseholdNotificationPreferences> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<HouseholdNotificationPreferences & {
    created_at: string | Date
    updated_at: string | Date
  }>(
    `INSERT INTO household_notification_preferences (profile_id)
     VALUES ($1)
     ON CONFLICT (profile_id) DO NOTHING
     RETURNING *`,
    [householdRootId],
  )

  const row =
    rows[0] ??
    (
      await pool.query<HouseholdNotificationPreferences & {
        created_at: string | Date
        updated_at: string | Date
      }>(
        `SELECT * FROM household_notification_preferences WHERE profile_id = $1`,
        [householdRootId],
      )
    ).rows[0]

  return mapNotificationPreferences(row)
}

export async function upsertNotificationPreferences(
  profileId: string,
  updates: Partial<Pick<
    HouseholdNotificationPreferences,
    | "browser_enabled"
    | "quiet_hours_enabled"
    | "quiet_hours_start"
    | "quiet_hours_end"
    | "default_event_offset_minutes"
    | "default_task_offset_minutes"
    | "default_school_offset_minutes"
    | "default_bill_offset_minutes"
    | "default_coparenting_offset_minutes"
  >>,
): Promise<HouseholdNotificationPreferences> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const current = await getNotificationPreferences(profileId)
  const next = {
    browser_enabled: updates.browser_enabled ?? current.browser_enabled,
    quiet_hours_enabled: updates.quiet_hours_enabled ?? current.quiet_hours_enabled,
    quiet_hours_start: updates.quiet_hours_start ?? current.quiet_hours_start,
    quiet_hours_end: updates.quiet_hours_end ?? current.quiet_hours_end,
    default_event_offset_minutes: normalizeReminderOffsetMinutes(updates.default_event_offset_minutes ?? current.default_event_offset_minutes),
    default_task_offset_minutes: normalizeReminderOffsetMinutes(updates.default_task_offset_minutes ?? current.default_task_offset_minutes),
    default_school_offset_minutes: normalizeReminderOffsetMinutes(updates.default_school_offset_minutes ?? current.default_school_offset_minutes),
    default_bill_offset_minutes: normalizeReminderOffsetMinutes(updates.default_bill_offset_minutes ?? current.default_bill_offset_minutes),
    default_coparenting_offset_minutes: normalizeReminderOffsetMinutes(updates.default_coparenting_offset_minutes ?? current.default_coparenting_offset_minutes),
  }

  const { rows } = await pool.query<HouseholdNotificationPreferences & {
    created_at: string | Date
    updated_at: string | Date
  }>(
    `UPDATE household_notification_preferences
     SET browser_enabled = $2,
         quiet_hours_enabled = $3,
         quiet_hours_start = $4,
         quiet_hours_end = $5,
         default_event_offset_minutes = $6,
         default_task_offset_minutes = $7,
         default_school_offset_minutes = $8,
         default_bill_offset_minutes = $9,
         default_coparenting_offset_minutes = $10,
         updated_at = NOW()
     WHERE profile_id = $1
     RETURNING *`,
    [
      householdRootId,
      next.browser_enabled,
      next.quiet_hours_enabled,
      next.quiet_hours_start,
      next.quiet_hours_end,
      next.default_event_offset_minutes,
      next.default_task_offset_minutes,
      next.default_school_offset_minutes,
      next.default_bill_offset_minutes,
      next.default_coparenting_offset_minutes,
    ],
  )

  return mapNotificationPreferences(rows[0])
}

export interface GoogleCalendarPreferences {
  profile_id: string
  visible: boolean
}

export interface GoogleCalendarEventOverride {
  id: string
  profile_id: string
  external_event_id: string
  member_name: string | null
  hidden: boolean
  created_at: string
  updated_at: string
}

export async function getGoogleCalendarPreferences(profileId: string): Promise<GoogleCalendarPreferences> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(
    `INSERT INTO google_calendar_preferences (profile_id)
     VALUES ($1)
     ON CONFLICT (profile_id) DO NOTHING`,
    [householdRootId],
  )

  const { rows } = await pool.query<GoogleCalendarPreferences>(
    `SELECT profile_id, visible
     FROM google_calendar_preferences
     WHERE profile_id = $1`,
    [householdRootId],
  )

  return rows[0] ?? { profile_id: householdRootId, visible: true }
}

export async function setGoogleCalendarVisibility(profileId: string, visible: boolean): Promise<GoogleCalendarPreferences> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<GoogleCalendarPreferences>(
    `INSERT INTO google_calendar_preferences (profile_id, visible, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (profile_id) DO UPDATE
       SET visible = EXCLUDED.visible,
           updated_at = NOW()
     RETURNING profile_id, visible`,
    [householdRootId, visible],
  )
  return rows[0]
}

export async function getGoogleCalendarEventOverrides(profileId: string): Promise<GoogleCalendarEventOverride[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<GoogleCalendarEventOverride>(
    `SELECT *
     FROM google_calendar_event_overrides
     WHERE profile_id = $1`,
    [householdRootId],
  )
  return rows
}

export async function upsertGoogleCalendarEventOverride(
  profileId: string,
  externalEventId: string,
  updates: {
    member_name?: string | null
    hidden?: boolean
  },
): Promise<GoogleCalendarEventOverride> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)

  await pool.query(
    `INSERT INTO google_calendar_event_overrides (profile_id, external_event_id)
     VALUES ($1, $2)
     ON CONFLICT (profile_id, external_event_id) DO NOTHING`,
    [householdRootId, externalEventId],
  )

  const allowed = ["member_name", "hidden"] as const
  const keys = allowed.filter((key) => key in updates)
  const values = keys.map((key) => {
    if (key === "hidden") return Boolean(updates.hidden)
    return updates.member_name ?? null
  })

  const setClauses = keys.map((key, index) => `"${key}" = $${index + 3}`)
  const { rows } = await pool.query<GoogleCalendarEventOverride>(
    `UPDATE google_calendar_event_overrides
     SET ${setClauses.length > 0 ? `${setClauses.join(", ")}, ` : ""}updated_at = NOW()
     WHERE profile_id = $1 AND external_event_id = $2
     RETURNING *`,
    [householdRootId, externalEventId, ...values],
  )

  return rows[0]
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const pool = getPool()
  const allowed = [
    "first_name", "last_name", "city", "timezone", "phone",
    "family_type", "co_parent_email", "partner_name",
    "onboarding_step", "onboarding_completed",
    "spouse_first_name", "spouse_last_name", "spouse_phone", "spouse_email",
    "address_street", "address_province", "address_postal", "address_country",
    "work_type", "work_address", "spouse_work_type", "spouse_work_address",
  ]
  const keys = Object.keys(updates).filter((k) => allowed.includes(k))
  if (keys.length === 0) return
  const setClauses = keys.map((k, i) => `"${k}" = $${i + 2}`)
  setClauses.push(`updated_at = NOW()`)
  const values = keys.map((k) => (updates as Record<string, unknown>)[k])
  await pool.query(
    `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $1`,
    [id, ...values]
  )
}

export async function getKids(profileId: string): Promise<Kid[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Kid>(
    "SELECT * FROM kids WHERE profile_id = $1 ORDER BY created_at",
    [householdRootId]
  )
  return rows
}

export async function replaceKids(
  profileId: string,
  kids: { name: string; first_name?: string | null; last_name?: string | null; dob: string | null; school_name?: string | null; school_address?: string | null; grade?: string | null; daycare_name?: string | null; daycare_address?: string | null }[]
) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM kids WHERE profile_id = $1", [householdRootId])
    for (const kid of kids) {
      await client.query(
        `INSERT INTO kids (profile_id, name, first_name, last_name, dob, school_name, school_address, grade, daycare_name, daycare_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [householdRootId, kid.name, kid.first_name ?? null, kid.last_name ?? null, kid.dob,
         kid.school_name ?? null, kid.school_address ?? null, kid.grade ?? null, kid.daycare_name ?? null, kid.daycare_address ?? null]
      )
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function getPets(profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    "SELECT * FROM pets WHERE profile_id = $1 ORDER BY created_at",
    [householdRootId]
  )
  return rows as { id: string; profile_id: string; name: string; animal_type: string; breed: string | null; dob: string | null; created_at: string }[]
}

export async function replacePets(
  profileId: string,
  pets: { name: string; animal_type: string; breed?: string | null; dob?: string | null }[]
) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM pets WHERE profile_id = $1", [householdRootId])
    for (const pet of pets) {
      await client.query(
        "INSERT INTO pets (profile_id, name, animal_type, breed, dob) VALUES ($1, $2, $3, $4, $5)",
        [householdRootId, pet.name, pet.animal_type, pet.breed ?? null, pet.dob ?? null]
      )
    }
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function saveCalendar(data: {
  profile_id: string
  kid_id: string | null
  filename: string
  storage_path: string
}) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(data.profile_id)
  await pool.query(
    `INSERT INTO calendars (profile_id, kid_id, filename, storage_path)
     VALUES ($1, $2, $3, $4)`,
    [householdRootId, data.kid_id, data.filename, data.storage_path]
  )
}

export async function getDocuments(profileId: string): Promise<FamilyDocument[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyDocument & {
    byte_size: string | number
    created_at: string | Date
    updated_at: string | Date
  }>(
    `SELECT * FROM family_documents WHERE profile_id = $1 ORDER BY created_at DESC`,
    [householdRootId],
  )
  return rows.map((row) => ({
    ...row,
    byte_size: Number(row.byte_size),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }))
}

export async function createDocument(profileId: string, data: {
  title: string
  file_name: string
  storage_path: string
  content_type?: string | null
  byte_size: number
  category: FamilyDocument["category"]
  member_name?: string | null
  notes?: string | null
}): Promise<FamilyDocument> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyDocument & {
    byte_size: string | number
    created_at: string | Date
    updated_at: string | Date
  }>(
    `INSERT INTO family_documents
      (profile_id, title, file_name, storage_path, content_type, byte_size, category, member_name, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      householdRootId,
      data.title,
      data.file_name,
      data.storage_path,
      data.content_type ?? null,
      data.byte_size,
      data.category,
      data.member_name ?? null,
      data.notes ?? null,
    ],
  )
  const row = rows[0]
  return {
    ...row,
    byte_size: Number(row.byte_size),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export async function getDocumentById(id: string, profileId: string): Promise<FamilyDocument | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyDocument & {
    byte_size: string | number
    created_at: string | Date
    updated_at: string | Date
  }>(
    `SELECT * FROM family_documents WHERE id = $1 AND profile_id = $2`,
    [id, householdRootId],
  )
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    byte_size: Number(row.byte_size),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export async function deleteDocument(id: string, profileId: string): Promise<FamilyDocument | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyDocument & {
    byte_size: string | number
    created_at: string | Date
    updated_at: string | Date
  }>(
    `DELETE FROM family_documents WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, householdRootId],
  )
  const row = rows[0]
  if (!row) return null
  return {
    ...row,
    byte_size: Number(row.byte_size),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

export async function getStoredFilePathsForAccount(profileId: string): Promise<string[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const [calendarResult, documentResult] = await Promise.all([
    pool.query<{ storage_path: string }>(`SELECT storage_path FROM calendars WHERE profile_id = $1`, [householdRootId]),
    pool.query<{ storage_path: string }>(`SELECT storage_path FROM family_documents WHERE profile_id = $1`, [householdRootId]),
  ])
  return [...calendarResult.rows, ...documentResult.rows].map((row) => row.storage_path)
}

export async function getExpiredUnpaidHouseholdRoots(): Promise<string[]> {
  const pool = getPool()
  const intervalDays = BILLING_TRIAL_DAYS + BILLING_GRACE_DAYS
  const { rows } = await pool.query<{ profile_id: string }>(
    `SELECT p.id AS profile_id
     FROM profiles p
     WHERE COALESCE(p.household_root_id, p.id) = p.id
       AND COALESCE(p.billing_trial_started_at, p.created_at) <= NOW() - ($1::text || ' days')::interval`,
    [String(intervalDays)],
  )
  return rows.map((row) => row.profile_id)
}

export async function getLastScanDate(profileId: string): Promise<Date | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT MAX(scanned_at) AS last_scan FROM scanned_events WHERE profile_id = $1`,
    [householdRootId]
  )
  return rows[0]?.last_scan ?? null
}

export async function getExistingMessageIds(profileId: string): Promise<Set<string>> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT gmail_message_id FROM scanned_events WHERE profile_id = $1 AND ai_processed = TRUE`,
    [householdRootId]
  )
  return new Set(rows.map((r: { gmail_message_id: string }) => r.gmail_message_id))
}

export async function saveScannedEvents(
  profileId: string,
  events: {
    gmail_message_id: string
    title: string
    event_date: string | null
    start_time?: string | null
    end_time?: string | null
    event_type: string
    organization_name: string | null
    organization_type: string | null
    source_from: string
    snippet: string
    related_member_name?: string | null
    related_member_type?: "adult" | "child" | "pet" | "family" | null
    kid_name?: string | null
    grade?: string | null
    school_name?: string | null
    special_instructions?: string | null
    urgency?: string | null
    auto_add_to_calendar?: boolean
    calendar_title?: string | null
    ai_processed?: boolean
    vendor?: string | null
    amount?: number | null
    recurrence?: string | null
  }[]
) {
  if (events.length === 0) return
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  for (const e of events) {
    await pool.query(
      `INSERT INTO scanned_events
         (profile_id, gmail_message_id, title, event_date, start_time, end_time,
          event_type, organization_name, organization_type, source_from, snippet,
          related_member_name, related_member_type, kid_name, grade, school_name, special_instructions, urgency,
          auto_add_to_calendar, calendar_title, ai_processed, vendor, amount, recurrence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (profile_id, gmail_message_id) DO UPDATE SET
         title = EXCLUDED.title,
         event_date = COALESCE(EXCLUDED.event_date, scanned_events.event_date),
         start_time = COALESCE(EXCLUDED.start_time, scanned_events.start_time),
         end_time = COALESCE(EXCLUDED.end_time, scanned_events.end_time),
         event_type = EXCLUDED.event_type,
         organization_name = EXCLUDED.organization_name,
         organization_type = EXCLUDED.organization_type,
         snippet = EXCLUDED.snippet,
         related_member_name = COALESCE(EXCLUDED.related_member_name, scanned_events.related_member_name),
         related_member_type = COALESCE(EXCLUDED.related_member_type, scanned_events.related_member_type),
         kid_name = COALESCE(EXCLUDED.kid_name, scanned_events.kid_name),
         grade = COALESCE(EXCLUDED.grade, scanned_events.grade),
         school_name = COALESCE(EXCLUDED.school_name, scanned_events.school_name),
         special_instructions = COALESCE(EXCLUDED.special_instructions, scanned_events.special_instructions),
         urgency = EXCLUDED.urgency,
         auto_add_to_calendar = EXCLUDED.auto_add_to_calendar,
         calendar_title = COALESCE(EXCLUDED.calendar_title, scanned_events.calendar_title),
         ai_processed = EXCLUDED.ai_processed,
         vendor = COALESCE(EXCLUDED.vendor, scanned_events.vendor),
         amount = COALESCE(EXCLUDED.amount, scanned_events.amount),
         recurrence = COALESCE(EXCLUDED.recurrence, scanned_events.recurrence),
         scanned_at = NOW()`,
      [
        householdRootId, e.gmail_message_id, e.title, e.event_date ?? null,
        e.start_time ?? null, e.end_time ?? null,
        e.event_type, e.organization_name, e.organization_type, e.source_from, e.snippet,
        e.related_member_name ?? null, e.related_member_type ?? null,
        e.kid_name ?? null, e.grade ?? null, e.school_name ?? null,
        e.special_instructions ?? null, e.urgency ?? "normal",
        e.auto_add_to_calendar ?? false, e.calendar_title ?? null, e.ai_processed ?? false,
        e.vendor ?? null, e.amount ?? null, e.recurrence ?? null,
      ]
    )
  }
}

export async function saveScannedOrganizations(
  profileId: string,
  orgs: { name: string; type: string; email_domain: string }[]
) {
  if (orgs.length === 0) return
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  for (const o of orgs) {
    await pool.query(
      `INSERT INTO scanned_organizations (profile_id, name, type, email_domain)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (profile_id, email_domain) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type`,
      [householdRootId, o.name, o.type, o.email_domain]
    )
  }
}

export async function getScannedEvents(profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT * FROM scanned_events WHERE profile_id = $1 ORDER BY event_date DESC NULLS LAST`,
    [householdRootId]
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    ...r,
    event_date: r.event_date instanceof Date ? r.event_date.toISOString() : r.event_date,
    scanned_at: r.scanned_at instanceof Date ? r.scanned_at.toISOString() : r.scanned_at,
    amount: r.amount != null ? Number(r.amount) : null,
  }))
}

export async function getScannedOrganizations(profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT * FROM scanned_organizations WHERE profile_id = $1 ORDER BY type, name`,
    [householdRootId]
  )
  return rows
}

export interface Event {
  id: string
  profile_id: string
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
  member_name: string | null
  reminder_offset_minutes: number | null
  source: string
  recurrence: string | null
  created_at: string
}

export async function getEvents(profileId: string, date?: string): Promise<Event[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  if (date) {
    const { rows } = await pool.query<Event>(
      `SELECT * FROM events WHERE profile_id = $1 AND event_date = $2 ORDER BY start_time NULLS LAST, created_at`,
      [householdRootId, date]
    )
    return rows
  }
  const { rows } = await pool.query<Event>(
    `SELECT * FROM events WHERE profile_id = $1 AND event_date >= CURRENT_DATE ORDER BY event_date, start_time NULLS LAST LIMIT 50`,
    [householdRootId]
  )
  return rows
}

export async function createEvent(profileId: string, data: {
  title: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
  description?: string | null
  member_name?: string | null
  reminder_offset_minutes?: number | null
  source?: string
  recurrence?: string | null
}): Promise<Event> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Event>(
    `INSERT INTO events (profile_id, title, event_date, start_time, end_time, description, member_name, reminder_offset_minutes, source, recurrence)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [householdRootId, data.title, data.event_date, data.start_time ?? null, data.end_time ?? null,
     data.description ?? null, data.member_name ?? null, normalizeReminderOffsetMinutes(data.reminder_offset_minutes), data.source ?? "manual", data.recurrence ?? null]
  )
  const event = rows[0]
  await syncEventReminder(event)
  return event
}

export interface IcsEvent {
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  description: string | null
}

export async function importIcsEvents(
  profileId: string,
  events: IcsEvent[],
  memberName: string
): Promise<{ imported: number; skipped: number }> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  // Load existing events for deduplication
  const { rows: existing } = await pool.query<{ title: string; event_date: string }>(
    `SELECT title, event_date FROM events WHERE profile_id = $1`,
    [householdRootId]
  )
  const existingSet = new Set(existing.map((e) => `${e.title.toLowerCase()}|${e.event_date}`))

  let imported = 0, skipped = 0
  for (const ev of events) {
    const key = `${ev.title.toLowerCase()}|${ev.event_date}`
    if (existingSet.has(key)) { skipped++; continue }
    existingSet.add(key)
    await pool.query(
      `INSERT INTO events (profile_id, title, event_date, start_time, end_time, description, member_name, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ics_import')`,
      [householdRootId, ev.title, ev.event_date, ev.start_time, ev.end_time, ev.description, memberName]
    )
    imported++
  }
  return { imported, skipped }
}

export async function updateEvent(id: string, profileId: string, data: {
  title?: string
  event_date?: string
  start_time?: string | null
  end_time?: string | null
  description?: string | null
  member_name?: string | null
  reminder_offset_minutes?: number | null
}): Promise<Event | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const allowed = [
    "title",
    "event_date",
    "start_time",
    "end_time",
    "description",
    "member_name",
    "reminder_offset_minutes",
  ] as const
  const keys = allowed.filter((key) => key in data)

  if (keys.length === 0) {
    const { rows } = await pool.query<Event>(
      `SELECT * FROM events WHERE id = $1 AND profile_id = $2`,
      [id, householdRootId]
    )
    return rows[0] ?? null
  }

  const setClauses = keys.map((key, index) => `"${key}" = $${index + 3}`)
  const values = keys.map((key) => key === "reminder_offset_minutes"
    ? normalizeReminderOffsetMinutes(data[key])
    : data[key] ?? null)
  const { rows } = await pool.query<Event>(
    `UPDATE events SET ${setClauses.join(", ")}
     WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, householdRootId, ...values]
  )
  const event = rows[0] ?? null
  if (event) await syncEventReminder(event)
  return event
}

export async function deleteEvent(id: string, profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(`DELETE FROM events WHERE id = $1 AND profile_id = $2`, [id, householdRootId])
  await deleteReminderBySource(householdRootId, "event", id)
}

export interface Task {
  id: string
  profile_id: string
  title: string
  due_date: string | null
  due_time: string | null
  notes: string | null
  assignee_name: string | null
  recurrence: "daily" | "weekly" | "monthly" | null
  reminder_offset_minutes: number | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export async function getTasks(profileId: string): Promise<Task[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Task>(
    `SELECT * FROM tasks WHERE profile_id = $1 ORDER BY completed ASC, due_date NULLS LAST, created_at DESC`,
    [householdRootId]
  )
  return rows
}

export async function createTask(profileId: string, data: {
  title: string
  due_date?: string | null
  due_time?: string | null
  notes?: string | null
  assignee_name?: string | null
  recurrence?: "daily" | "weekly" | "monthly" | null
  reminder_offset_minutes?: number | null
}): Promise<Task> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Task>(
    `INSERT INTO tasks (profile_id, title, due_date, due_time, notes, assignee_name, recurrence, reminder_offset_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [householdRootId, data.title, data.due_date ?? null, data.due_time ?? null, data.notes ?? null, data.assignee_name ?? null, data.recurrence ?? null, normalizeReminderOffsetMinutes(data.reminder_offset_minutes)]
  )
  const task = rows[0]
  await syncTaskReminder(task)
  return task
}

export async function updateTask(id: string, profileId: string, data: {
  title: string
  due_date: string | null
  due_time: string | null
  notes: string | null
  assignee_name: string | null
  recurrence: "daily" | "weekly" | "monthly" | null
  reminder_offset_minutes: number | null
}): Promise<Task | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Task>(
    `UPDATE tasks SET title = $3, due_date = $4, due_time = $5, notes = $6, assignee_name = $7, recurrence = $8, reminder_offset_minutes = $9
     WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, householdRootId, data.title, data.due_date, data.due_time, data.notes, data.assignee_name, data.recurrence, normalizeReminderOffsetMinutes(data.reminder_offset_minutes)]
  )
  const task = rows[0] ?? null
  if (task) await syncTaskReminder(task)
  return task
}

export async function toggleTask(id: string, profileId: string, completed: boolean): Promise<{ task: Task | null; spawnedTask: Task | null }> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const { rows } = await client.query<Task>(
      `UPDATE tasks SET completed = $3, completed_at = $4 WHERE id = $1 AND profile_id = $2 RETURNING *`,
      [id, householdRootId, completed, completed ? new Date().toISOString() : null]
    )
    const task = rows[0] ?? null
    let spawnedTask: Task | null = null
    if (!task) {
      await client.query("ROLLBACK")
      return { task: null, spawnedTask: null }
    }

    if (completed) {
      await syncTaskReminder(task, client)
      if (task.recurrence && task.due_date) {
        const nextDueDate = addRecurringDate(task.due_date, task.recurrence)
        const { rows: spawnedRows } = await client.query<Task>(
          `INSERT INTO tasks (profile_id, title, due_date, due_time, notes, assignee_name, recurrence, reminder_offset_minutes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
          [householdRootId, task.title, nextDueDate, task.due_time, task.notes, task.assignee_name, task.recurrence, task.reminder_offset_minutes]
        )
        spawnedTask = spawnedRows[0] ?? null
        if (spawnedTask) await syncTaskReminder(spawnedTask, client)
      }
    } else {
      await syncTaskReminder(task, client)
    }

    await client.query("COMMIT")
    return { task, spawnedTask }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function deleteTask(id: string, profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(`DELETE FROM tasks WHERE id = $1 AND profile_id = $2`, [id, householdRootId])
  await deleteReminderBySource(householdRootId, "task", id)
}

function isDateValue(value: unknown): value is Date {
  return value instanceof Date
}

function addRecurringDate(dueDate: string, recurrence: "daily" | "weekly" | "monthly"): string {
  const next = new Date(`${dueDate}T12:00:00Z`)
  if (recurrence === "daily") next.setUTCDate(next.getUTCDate() + 1)
  if (recurrence === "weekly") next.setUTCDate(next.getUTCDate() + 7)
  if (recurrence === "monthly") next.setUTCMonth(next.getUTCMonth() + 1)
  return next.toISOString().slice(0, 10)
}

function formatLocalReminderDateTime(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}:00`
}

function reminderDateTime(dateValue: string, timeValue: string | null, offsetMinutes: number | null | undefined): string {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = (timeValue ?? "09:00").split(":").map(Number)
  const reminder = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0)
  reminder.setMinutes(reminder.getMinutes() - normalizeReminderOffsetMinutes(offsetMinutes))
  return formatLocalReminderDateTime(reminder)
}

function taskReminderAt(task: Pick<Task, "due_date" | "due_time" | "reminder_offset_minutes">): string | null {
  if (!task.due_date) return null
  return reminderDateTime(task.due_date, task.due_time, task.reminder_offset_minutes)
}

function eventReminderAt(event: Pick<Event, "event_date" | "start_time" | "reminder_offset_minutes">): string | null {
  if (!event.event_date) return null
  return reminderDateTime(event.event_date, event.start_time, event.reminder_offset_minutes)
}

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
}

async function syncTaskReminder(task: Task, clientArg?: Queryable): Promise<void> {
  const pool = getPool()
  const client = clientArg ?? pool
  if (!task.due_date || task.completed) {
    await client.query(
      `DELETE FROM reminders WHERE profile_id = $1 AND source_type = 'task' AND source_id = $2`,
      [task.profile_id, task.id]
    )
    return
  }

  const remindAt = taskReminderAt(task)
  if (!remindAt) return
  const title = task.assignee_name
    ? `${task.title} · ${task.assignee_name}`
    : task.title

  await client.query(
    `INSERT INTO reminders (profile_id, source_type, source_id, title, note, remind_at, status, updated_at)
     VALUES ($1,'task',$2,$3,$4,$5,'pending',NOW())
     ON CONFLICT (profile_id, source_type, source_id) DO UPDATE SET
       title = EXCLUDED.title,
       note = EXCLUDED.note,
       remind_at = EXCLUDED.remind_at,
       status = 'pending',
       updated_at = NOW()`,
    [task.profile_id, task.id, title, task.notes ?? null, remindAt]
  )
}

async function syncEventReminder(event: Event, clientArg?: Queryable): Promise<void> {
  const pool = getPool()
  const client = clientArg ?? pool
  const remindAt = eventReminderAt(event)
  if (!remindAt) {
    await client.query(
      `DELETE FROM reminders WHERE profile_id = $1 AND source_type = 'event' AND source_id = $2`,
      [event.profile_id, event.id],
    )
    return
  }

  const title = event.member_name
    ? `${event.title} · ${event.member_name}`
    : event.title

  await client.query(
    `INSERT INTO reminders (profile_id, source_type, source_id, title, note, remind_at, status, updated_at)
     VALUES ($1,'event',$2,$3,$4,$5,'pending',NOW())
     ON CONFLICT (profile_id, source_type, source_id) DO UPDATE SET
       title = EXCLUDED.title,
       note = EXCLUDED.note,
       remind_at = EXCLUDED.remind_at,
       status = 'pending',
       updated_at = NOW()`,
    [event.profile_id, event.id, title, event.description ?? null, remindAt],
  )
}

async function deleteReminderBySource(profileId: string, sourceType: Reminder["source_type"], sourceId: string) {
  const pool = getPool()
  await pool.query(
    `DELETE FROM reminders WHERE profile_id = $1 AND source_type = $2 AND source_id = $3`,
    [profileId, sourceType, sourceId]
  )
}

export async function getReminders(profileId: string): Promise<Reminder[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Reminder & { remind_at: string | Date; created_at: string | Date; updated_at: string | Date }>(
    `SELECT * FROM reminders
     WHERE profile_id = $1 AND status = 'pending'
     ORDER BY remind_at ASC, created_at DESC`,
    [householdRootId]
  )
  return rows.map((row) => ({
    ...row,
    remind_at: isDateValue(row.remind_at) ? row.remind_at.toISOString() : String(row.remind_at),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    updated_at: isDateValue(row.updated_at) ? row.updated_at.toISOString() : String(row.updated_at),
  }))
}

export async function createReminder(profileId: string, data: {
  source_type: Reminder["source_type"]
  source_id?: string | null
  title: string
  note?: string | null
  remind_at: string
}): Promise<Reminder> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Reminder>(
    `INSERT INTO reminders (profile_id, source_type, source_id, title, note, remind_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (profile_id, source_type, source_id) DO UPDATE SET
       title = EXCLUDED.title,
       note = EXCLUDED.note,
       remind_at = EXCLUDED.remind_at,
       status = 'pending',
       updated_at = NOW()
     RETURNING *`,
    [householdRootId, data.source_type, data.source_id ?? null, data.title, data.note ?? null, data.remind_at]
  )
  const reminder = rows[0]
  return {
    ...reminder,
    remind_at: String(reminder.remind_at),
    created_at: String(reminder.created_at),
    updated_at: String(reminder.updated_at),
  }
}

export async function dismissReminder(id: string, profileId: string): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(
    `UPDATE reminders SET status = 'dismissed', updated_at = NOW() WHERE id = $1 AND profile_id = $2`,
    [id, householdRootId]
  )
}

export async function snoozeReminder(id: string, profileId: string, remindAt: string): Promise<Reminder | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Reminder>(
    `UPDATE reminders SET remind_at = $3, status = 'pending', updated_at = NOW()
     WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, householdRootId, remindAt]
  )
  const reminder = rows[0] ?? null
  return reminder ? {
    ...reminder,
    remind_at: String(reminder.remind_at),
    created_at: String(reminder.created_at),
    updated_at: String(reminder.updated_at),
  } : null
}

export async function getScannedEventActions(profileId: string): Promise<ScannedEventAction[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<
    ScannedEventAction & {
      handled_at: string | Date | null
      created_at: string | Date
      updated_at: string | Date
    }
  >(
    `SELECT * FROM scanned_event_actions
     WHERE profile_id = $1
     ORDER BY updated_at DESC`,
    [householdRootId],
  )
  return rows.map(mapScannedEventAction)
}

export async function upsertScannedEventAction(
  profileId: string,
  scannedEventId: string,
  data: {
    status?: ScannedEventAction["status"]
    assigned_to?: string | null
    last_action?: ScannedEventAction["last_action"]
    corrected_member_name?: string | null
    corrected_member_type?: ScannedEventAction["corrected_member_type"]
    corrected_event_type?: ScannedEventAction["corrected_event_type"]
    relevance?: ScannedEventAction["relevance"]
  },
): Promise<ScannedEventAction> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const status = data.status ?? "new"
  const assignedTo = data.assigned_to ?? null
  const lastAction = data.last_action ?? null
  const correctedMemberName = data.corrected_member_name ?? null
  const correctedMemberType = data.corrected_member_type ?? null
  const correctedEventType = data.corrected_event_type ?? null
  const relevance = data.relevance ?? "relevant"
  const handledAt = status === "handled" ? new Date().toISOString() : null
  const { rows } = await pool.query<
    ScannedEventAction & {
      handled_at: string | Date | null
      created_at: string | Date
      updated_at: string | Date
    }
  >(
    `INSERT INTO scanned_event_actions (
       profile_id, scanned_event_id, status, assigned_to, last_action, corrected_member_name,
       corrected_member_type, corrected_event_type, relevance, handled_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (profile_id, scanned_event_id) DO UPDATE SET
       status = COALESCE($3, scanned_event_actions.status),
       assigned_to = $4,
       last_action = COALESCE($5, scanned_event_actions.last_action),
       corrected_member_name = COALESCE($6, scanned_event_actions.corrected_member_name),
       corrected_member_type = COALESCE($7, scanned_event_actions.corrected_member_type),
       corrected_event_type = COALESCE($8, scanned_event_actions.corrected_event_type),
       relevance = COALESCE($9, scanned_event_actions.relevance),
       handled_at = CASE
         WHEN COALESCE($3, scanned_event_actions.status) = 'handled' THEN COALESCE($10, scanned_event_actions.handled_at, NOW())
         ELSE NULL
       END,
       updated_at = NOW()
     RETURNING *`,
    [
      householdRootId,
      scannedEventId,
      data.status ?? null,
      assignedTo,
      lastAction,
      correctedMemberName,
      correctedMemberType,
      correctedEventType,
      relevance,
      handledAt,
    ],
  )
  return mapScannedEventAction(rows[0])
}

export async function getFamilyInvites(profileId: string): Promise<FamilyInvite[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyInvite & {
    accepted_at: string | Date | null
    expires_at: string | Date
    created_at: string | Date
  }>(
    `SELECT * FROM family_invites WHERE profile_id = $1 ORDER BY created_at DESC`,
    [householdRootId]
  )
  return rows.map((row) => ({
    ...row,
    accepted_at: row.accepted_at ? (isDateValue(row.accepted_at) ? row.accepted_at.toISOString() : String(row.accepted_at)) : null,
    expires_at: isDateValue(row.expires_at) ? row.expires_at.toISOString() : String(row.expires_at),
    created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
  }))
}

export async function createFamilyInvite(profileId: string, data: {
  invitee_email: string
  invited_name?: string | null
  relation: FamilyInvite["relation"]
  role: FamilyInvite["role"]
}): Promise<FamilyInvite> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const token = randomUUID()
  const { rows } = await pool.query<FamilyInvite>(
    `INSERT INTO family_invites (profile_id, invitee_email, invited_name, relation, role, token)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [householdRootId, data.invitee_email.toLowerCase(), data.invited_name ?? null, data.relation, data.role, token]
  )
  const invite = rows[0]
  return {
    ...invite,
    accepted_at: invite.accepted_at ? String(invite.accepted_at) : null,
    expires_at: String(invite.expires_at),
    created_at: String(invite.created_at),
  }
}

export async function revokeFamilyInvite(profileId: string, inviteId: string): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(
    `UPDATE family_invites SET status = 'revoked' WHERE id = $1 AND profile_id = $2`,
    [inviteId, householdRootId]
  )
}

export async function acceptPendingFamilyInvites(email: string, acceptedByProfileId: string): Promise<void> {
  const pool = getPool()
  const { rows } = await pool.query<{ profile_id: string }>(
    `SELECT profile_id
     FROM family_invites
     WHERE LOWER(invitee_email) = LOWER($1)
       AND status = 'pending'
       AND expires_at > NOW()
     ORDER BY created_at ASC`,
    [email],
  )
  if (!rows[0]) return
  const householdRootId = await resolveHouseholdRootId(rows[0].profile_id)
  await pool.query(
    `UPDATE profiles SET household_root_id = $2 WHERE id = $1`,
    [acceptedByProfileId, householdRootId],
  )
  clearHouseholdRootCache(acceptedByProfileId)
  await pool.query(
    `UPDATE family_invites
     SET status = 'accepted', accepted_at = NOW(), accepted_by_profile_id = $2
     WHERE LOWER(invitee_email) = LOWER($1)
       AND status = 'pending'
       AND expires_at > NOW()`,
    [email, acceptedByProfileId],
  )
}

export async function getHouseholdMembers(profileId: string): Promise<HouseholdMember[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<
    HouseholdMember & {
      joined_at: string | Date | null
    }
  >(
    `SELECT
        p.id AS profile_id,
        COALESCE(p.household_root_id, p.id) AS household_root_id,
        p.email,
        p.first_name,
        p.last_name,
        COALESCE(fi.role, CASE WHEN p.id = $1 THEN 'owner' ELSE 'member' END) AS role,
        COALESCE(fi.relation, CASE WHEN p.id = $1 THEN 'owner' ELSE 'family_member' END) AS relation,
        fi.accepted_at AS joined_at
      FROM profiles p
      LEFT JOIN family_invites fi
        ON fi.accepted_by_profile_id = p.id
       AND fi.profile_id = $1
       AND fi.status = 'accepted'
      WHERE COALESCE(p.household_root_id, p.id) = $1
      ORDER BY CASE WHEN p.id = $1 THEN 0 ELSE 1 END, p.created_at ASC`,
    [householdRootId],
  )
  return rows.map((row) => ({
    ...row,
    joined_at: row.joined_at ? (isDateValue(row.joined_at) ? row.joined_at.toISOString() : String(row.joined_at)) : null,
  }))
}

export async function deleteAccount(
  profileId: string,
  reason: TrialRetentionReason = "user_deleted",
  feedbackCategory?: DeletionFeedbackCategory | null,
): Promise<{ deletedHousehold: boolean }> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const { rows } = await client.query<{ id: string; household_root_id: string | null }>(
      `SELECT id, COALESCE(household_root_id, id) AS household_root_id
       FROM profiles
       WHERE id = $1`,
      [profileId],
    )
    const current = rows[0]
    if (!current) {
      throw new Error("Account not found")
    }

    const householdRootId = current.household_root_id ?? profileId
    const { rows: memberRows } = await client.query<{ id: string }>(
      `SELECT id
       FROM profiles
       WHERE COALESCE(household_root_id, id) = $1`,
      [householdRootId],
    )

    if (profileId === householdRootId) {
      await client.query(
        `DELETE FROM profiles
         WHERE COALESCE(household_root_id, id) = $1`,
        [householdRootId],
      )
      await markTrialRetentionDeleted(memberRows.map((member) => member.id), reason, feedbackCategory, client)
      await client.query("COMMIT")
      for (const member of memberRows) clearHouseholdRootCache(member.id)
      clearHouseholdRootCache(householdRootId)
      return { deletedHousehold: true }
    }

    await client.query(
      `UPDATE family_invites
       SET status = 'revoked', accepted_by_profile_id = NULL
       WHERE accepted_by_profile_id = $1`,
      [profileId],
    )
    await client.query(`DELETE FROM profiles WHERE id = $1`, [profileId])
    await markTrialRetentionDeleted([profileId], reason, feedbackCategory, client)
    await client.query("COMMIT")
    clearHouseholdRootCache(profileId)
    return { deletedHousehold: false }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export interface Expense {
  id: string
  profile_id: string
  title: string
  amount: number
  category: string | null
  expense_date: string
  notes: string | null
  created_at: string
}

export async function getExpenses(profileId: string): Promise<Expense[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<Expense & { expense_date: string | Date; amount: string | number }>(
    `SELECT * FROM expenses WHERE profile_id = $1 ORDER BY expense_date DESC, created_at DESC LIMIT 200`,
    [householdRootId]
  )
  return rows.map((r) => ({
    ...r,
    expense_date: isDateValue(r.expense_date) ? r.expense_date.toISOString().split("T")[0] : String(r.expense_date).slice(0, 10),
    amount: Number(r.amount),
  }))
}

export async function createExpense(profileId: string, data: {
  title: string; amount: number; category?: string | null; expense_date: string; notes?: string | null
}): Promise<Expense> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `INSERT INTO expenses (profile_id, title, amount, category, expense_date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [householdRootId, data.title, data.amount, data.category ?? null, data.expense_date, data.notes ?? null]
  )
  const r = rows[0]
  return { ...r, expense_date: String(r.expense_date).slice(0, 10), amount: Number(r.amount) }
}

export async function deleteExpense(id: string, profileId: string) {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(`DELETE FROM expenses WHERE id = $1 AND profile_id = $2`, [id, householdRootId])
}

export interface AdminHouseholdOverview {
  household_root_id: string
  primary_email: string
  primary_name: string
  family_type: string | null
  member_count: number
  pending_invites: number
  kid_count: number
  pet_count: number
  document_count: number
  scanned_event_count: number
  trial_started_at: string
  billing_status: "trial" | "grace" | "expired"
  created_at: string
}

export async function getAdminHouseholdOverview(): Promise<AdminHouseholdOverview[]> {
  const pool = getPool()
  const { rows } = await pool.query<{
    household_root_id: string
    primary_email: string
    primary_name: string
    family_type: string | null
    member_count: string | number
    pending_invites: string | number
    kid_count: string | number
    pet_count: string | number
    document_count: string | number
    scanned_event_count: string | number
    trial_started_at: string | Date
    created_at: string | Date
  }>(
    `SELECT
        p.id AS household_root_id,
        p.email AS primary_email,
        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS primary_name,
        p.family_type,
        (
          SELECT COUNT(*) FROM profiles members
          WHERE COALESCE(members.household_root_id, members.id) = p.id
        ) AS member_count,
        (
          SELECT COUNT(*) FROM family_invites fi
          WHERE fi.profile_id = p.id AND fi.status = 'pending'
        ) AS pending_invites,
        (SELECT COUNT(*) FROM kids k WHERE k.profile_id = p.id) AS kid_count,
        (SELECT COUNT(*) FROM pets pet WHERE pet.profile_id = p.id) AS pet_count,
        (SELECT COUNT(*) FROM family_documents d WHERE d.profile_id = p.id) AS document_count,
        (SELECT COUNT(*) FROM scanned_events se WHERE se.profile_id = p.id) AS scanned_event_count,
        COALESCE(p.billing_trial_started_at, p.created_at) AS trial_started_at,
        p.created_at
      FROM profiles p
      WHERE COALESCE(p.household_root_id, p.id) = p.id
      ORDER BY p.created_at DESC`,
  )

  return rows.map((row) => {
    const trialStartedAt = isDateValue(row.trial_started_at) ? row.trial_started_at.toISOString() : String(row.trial_started_at)
    return {
      household_root_id: row.household_root_id,
      primary_email: row.primary_email,
      primary_name: row.primary_name.trim() || row.primary_email,
      family_type: row.family_type,
      member_count: Number(row.member_count),
      pending_invites: Number(row.pending_invites),
      kid_count: Number(row.kid_count),
      pet_count: Number(row.pet_count),
      document_count: Number(row.document_count),
      scanned_event_count: Number(row.scanned_event_count),
      trial_started_at: trialStartedAt,
      billing_status: getTrialWindow(trialStartedAt).status,
      created_at: isDateValue(row.created_at) ? row.created_at.toISOString() : String(row.created_at),
    }
  })
}

// ── Family Facts ──────────────────────────────────────────────────────────────

export async function getFamilyFacts(profileId: string): Promise<FamilyFact[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<FamilyFact & {
    source_email_ids: string[] | null
    first_seen: string | Date
    last_confirmed: string | Date
  }>(
    `SELECT * FROM family_facts WHERE profile_id = $1 ORDER BY subject, predicate, confidence DESC`,
    [householdRootId]
  )
  return rows.map((r) => ({
    ...r,
    source_email_ids: r.source_email_ids ?? [],
    first_seen: isDateValue(r.first_seen) ? r.first_seen.toISOString() : r.first_seen,
    last_confirmed: isDateValue(r.last_confirmed) ? r.last_confirmed.toISOString() : r.last_confirmed,
  }))
}

export async function upsertFacts(profileId: string, facts: RawFact[]): Promise<void> {
  if (facts.length === 0) return
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  for (const f of facts) {
    const emailId = f.gmail_message_id ?? null
    await pool.query(
      `INSERT INTO family_facts
         (profile_id, subject, subject_type, predicate, object, confidence, evidence_count, source_email_ids, status)
       VALUES ($1,$2,$3,$4,$5,$6,1,ARRAY[$7]::TEXT[],'confirmed')
       ON CONFLICT (profile_id, subject, predicate, object) DO UPDATE SET
         confidence     = LEAST(0.99, (family_facts.confidence * family_facts.evidence_count + $6) / (family_facts.evidence_count + 1)),
         evidence_count = family_facts.evidence_count + 1,
         source_email_ids = (
           SELECT ARRAY(SELECT DISTINCT unnest(family_facts.source_email_ids || ARRAY[$7]::TEXT[]))
           WHERE $7 IS NOT NULL
         ),
         last_confirmed = NOW()`,
      [householdRootId, f.subject, f.subject_type, f.predicate, f.object, f.confidence, emailId]
    )
  }
}

export async function updateFactStatus(
  profileId: string,
  id: string,
  status: "confirmed" | "uncertain" | "conflicted"
): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(
    `UPDATE family_facts SET status = $3 WHERE id = $1 AND profile_id = $2`,
    [id, householdRootId, status]
  )
}

export async function deleteFact(id: string, profileId: string): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(`DELETE FROM family_facts WHERE id = $1 AND profile_id = $2`, [id, householdRootId])
}

export async function updateFactObject(id: string, profileId: string, object: string): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(
    `UPDATE family_facts SET object = $3, status = 'confirmed' WHERE id = $1 AND profile_id = $2`,
    [id, householdRootId, object]
  )
}

// ── Co-Parenting ──────────────────────────────────────────────────────────────

export interface CoParentingSchedule {
  id: string
  profile_id: string
  schedule_type: string
  start_date: string
  exchange_time: string | null
  exchange_location: string | null
  parent_a_name: string
  parent_b_name: string
  kid_ids: string[]
  coparent_email: string | null
  active: boolean
  created_at: string
}

export interface CoParentingOverride {
  id: string
  schedule_id: string
  profile_id: string
  override_date: string
  assigned_to: string
  note: string | null
  created_at: string
}

export async function getCoParentingSchedule(profileId: string): Promise<CoParentingSchedule | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT * FROM coparenting_schedules WHERE profile_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
    [householdRootId]
  )
  if (!rows[0]) return null
  const r = rows[0]
  return { ...r, start_date: String(r.start_date).slice(0, 10), kid_ids: Array.isArray(r.kid_ids) ? r.kid_ids : [] }
}

export async function upsertCoParentingSchedule(
  profileId: string,
  data: {
    schedule_type: string
    start_date: string
    exchange_time: string | null
    exchange_location: string | null
    parent_a_name: string
    parent_b_name: string
    kid_ids: string[]
    coparent_email?: string | null
  }
): Promise<CoParentingSchedule> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)

  // Prefer updating the existing active record so overrides (tied to schedule_id) are preserved.
  const { rows: existing } = await pool.query(
    `SELECT id FROM coparenting_schedules WHERE profile_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
    [householdRootId]
  )

  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE coparenting_schedules SET
         schedule_type = $2, start_date = $3, exchange_time = $4, exchange_location = $5,
         parent_a_name = $6, parent_b_name = $7, kid_ids = $8, coparent_email = $9, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [existing[0].id, data.schedule_type, data.start_date, data.exchange_time, data.exchange_location,
       data.parent_a_name, data.parent_b_name, JSON.stringify(data.kid_ids), data.coparent_email ?? null]
    )
    const r = rows[0]
    return { ...r, start_date: String(r.start_date).slice(0, 10), kid_ids: Array.isArray(r.kid_ids) ? r.kid_ids : [] }
  }

  // No active schedule yet — insert a new one.
  const { rows } = await pool.query(
    `INSERT INTO coparenting_schedules
       (profile_id, schedule_type, start_date, exchange_time, exchange_location, parent_a_name, parent_b_name, kid_ids, coparent_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [householdRootId, data.schedule_type, data.start_date, data.exchange_time, data.exchange_location,
     data.parent_a_name, data.parent_b_name, JSON.stringify(data.kid_ids), data.coparent_email ?? null]
  )
  const r = rows[0]
  return { ...r, start_date: String(r.start_date).slice(0, 10), kid_ids: Array.isArray(r.kid_ids) ? r.kid_ids : [] }
}

export async function getCoParentingOverrides(profileId: string, scheduleId: string): Promise<CoParentingOverride[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `SELECT * FROM coparenting_overrides WHERE profile_id = $1 AND schedule_id = $2 ORDER BY override_date ASC`,
    [householdRootId, scheduleId]
  )
  return rows.map((r) => ({ ...r, override_date: String(r.override_date).slice(0, 10) }))
}

export async function createCoParentingOverride(
  profileId: string,
  data: { schedule_id: string; override_date: string; assigned_to: string; note: string | null }
): Promise<CoParentingOverride> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query(
    `INSERT INTO coparenting_overrides (profile_id, schedule_id, override_date, assigned_to, note)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (schedule_id, override_date) DO UPDATE SET assigned_to = EXCLUDED.assigned_to, note = EXCLUDED.note
     RETURNING *`,
    [householdRootId, data.schedule_id, data.override_date, data.assigned_to, data.note]
  )
  const r = rows[0]
  return { ...r, override_date: String(r.override_date).slice(0, 10) }
}

export async function deleteCoParentingOverride(id: string, profileId: string): Promise<void> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  await pool.query(`DELETE FROM coparenting_overrides WHERE id = $1 AND profile_id = $2`, [id, householdRootId])
}

export async function getCoParentingSwapRequests(profileId: string, scheduleId: string): Promise<CoParentingSwapRequest[]> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<
    CoParentingSwapRequest & {
      requested_date: string | Date
      created_at: string | Date
      updated_at: string | Date
    }
  >(
    `SELECT * FROM coparenting_swap_requests
     WHERE profile_id = $1
       AND schedule_id = $2
     ORDER BY requested_date DESC, created_at DESC`,
    [householdRootId, scheduleId],
  )
  return rows.map(mapCoParentingSwapRequest)
}

export async function createCoParentingSwapRequest(
  profileId: string,
  data: {
    schedule_id: string
    requested_date: string
    requested_by: "a" | "b"
    requested_to: "a" | "b"
    note: string | null
  },
): Promise<CoParentingSwapRequest> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const { rows } = await pool.query<
    CoParentingSwapRequest & {
      requested_date: string | Date
      created_at: string | Date
      updated_at: string | Date
    }
  >(
    `INSERT INTO coparenting_swap_requests
      (profile_id, schedule_id, requested_date, requested_by, requested_to, note)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [householdRootId, data.schedule_id, data.requested_date, data.requested_by, data.requested_to, data.note],
  )
  return mapCoParentingSwapRequest(rows[0])
}

export async function resolveCoParentingSwapRequest(
  profileId: string,
  requestId: string,
  resolution: {
    status: "approved" | "declined"
    decision_note: string | null
  },
): Promise<CoParentingSwapRequest | null> {
  const pool = getPool()
  const householdRootId = await resolveHouseholdRootId(profileId)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const { rows } = await client.query<
      CoParentingSwapRequest & {
        requested_date: string | Date
        created_at: string | Date
        updated_at: string | Date
      }
    >(
      `UPDATE coparenting_swap_requests
       SET status = $3, decision_note = $4, updated_at = NOW()
       WHERE id = $1 AND profile_id = $2
       RETURNING *`,
      [requestId, householdRootId, resolution.status, resolution.decision_note],
    )
    const request = rows[0] ?? null
    if (!request) {
      await client.query("ROLLBACK")
      return null
    }

    if (resolution.status === "approved") {
      await client.query(
        `INSERT INTO coparenting_overrides (profile_id, schedule_id, override_date, assigned_to, note)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (schedule_id, override_date) DO UPDATE
         SET assigned_to = EXCLUDED.assigned_to,
             note = EXCLUDED.note`,
        [
          householdRootId,
          request.schedule_id,
          isDateValue(request.requested_date) ? request.requested_date.toISOString().slice(0, 10) : String(request.requested_date).slice(0, 10),
          request.requested_to,
          request.decision_note ?? request.note,
        ],
      )
    }

    await client.query("COMMIT")
    return mapCoParentingSwapRequest(request)
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
