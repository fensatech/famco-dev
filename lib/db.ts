import { getPool } from "./supabase"
import type { Profile, Kid, FamilyFact, RawFact } from "@/types"

export async function createProfile(data: {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}) {
  const pool = getPool()
  await pool.query(
    `INSERT INTO profiles (id, email, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO NOTHING`,
    [data.id, data.email, data.first_name, data.last_name]
  )
}

export async function getProfile(id: string): Promise<Profile | null> {
  const pool = getPool()
  const { rows } = await pool.query<Profile>(
    "SELECT * FROM profiles WHERE id = $1",
    [id]
  )
  return rows[0] ?? null
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
  const { rows } = await pool.query<Kid>(
    "SELECT * FROM kids WHERE profile_id = $1 ORDER BY created_at",
    [profileId]
  )
  return rows
}

export async function replaceKids(
  profileId: string,
  kids: { name: string; first_name?: string | null; last_name?: string | null; dob: string | null; school_name?: string | null; grade?: string | null; daycare_name?: string | null; daycare_address?: string | null }[]
) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM kids WHERE profile_id = $1", [profileId])
    for (const kid of kids) {
      await client.query(
        `INSERT INTO kids (profile_id, name, first_name, last_name, dob, school_name, grade, daycare_name, daycare_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [profileId, kid.name, kid.first_name ?? null, kid.last_name ?? null, kid.dob,
         kid.school_name ?? null, kid.grade ?? null, kid.daycare_name ?? null, kid.daycare_address ?? null]
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
  const { rows } = await pool.query(
    "SELECT * FROM pets WHERE profile_id = $1 ORDER BY created_at",
    [profileId]
  )
  return rows as { id: string; profile_id: string; name: string; animal_type: string; breed: string | null; dob: string | null; created_at: string }[]
}

export async function replacePets(
  profileId: string,
  pets: { name: string; animal_type: string; breed?: string | null; dob?: string | null }[]
) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM pets WHERE profile_id = $1", [profileId])
    for (const pet of pets) {
      await client.query(
        "INSERT INTO pets (profile_id, name, animal_type, breed, dob) VALUES ($1, $2, $3, $4, $5)",
        [profileId, pet.name, pet.animal_type, pet.breed ?? null, pet.dob ?? null]
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
  await pool.query(
    `INSERT INTO calendars (profile_id, kid_id, filename, storage_path)
     VALUES ($1, $2, $3, $4)`,
    [data.profile_id, data.kid_id, data.filename, data.storage_path]
  )
}

export async function getLastScanDate(profileId: string): Promise<Date | null> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT MAX(scanned_at) AS last_scan FROM scanned_events WHERE profile_id = $1`,
    [profileId]
  )
  return rows[0]?.last_scan ?? null
}

export async function getExistingMessageIds(profileId: string): Promise<Set<string>> {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT gmail_message_id FROM scanned_events WHERE profile_id = $1 AND ai_processed = TRUE`,
    [profileId]
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
  for (const e of events) {
    await pool.query(
      `INSERT INTO scanned_events
         (profile_id, gmail_message_id, title, event_date, start_time, end_time,
          event_type, organization_name, organization_type, source_from, snippet,
          kid_name, grade, school_name, special_instructions, urgency,
          auto_add_to_calendar, calendar_title, ai_processed, vendor, amount, recurrence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (profile_id, gmail_message_id) DO UPDATE SET
         title = EXCLUDED.title,
         event_date = COALESCE(EXCLUDED.event_date, scanned_events.event_date),
         start_time = COALESCE(EXCLUDED.start_time, scanned_events.start_time),
         end_time = COALESCE(EXCLUDED.end_time, scanned_events.end_time),
         event_type = EXCLUDED.event_type,
         organization_name = EXCLUDED.organization_name,
         organization_type = EXCLUDED.organization_type,
         snippet = EXCLUDED.snippet,
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
        profileId, e.gmail_message_id, e.title, e.event_date ?? null,
        e.start_time ?? null, e.end_time ?? null,
        e.event_type, e.organization_name, e.organization_type, e.source_from, e.snippet,
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
  for (const o of orgs) {
    await pool.query(
      `INSERT INTO scanned_organizations (profile_id, name, type, email_domain)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (profile_id, email_domain) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type`,
      [profileId, o.name, o.type, o.email_domain]
    )
  }
}

export async function getScannedEvents(profileId: string) {
  const pool = getPool()
  const { rows } = await pool.query(
    `SELECT * FROM scanned_events WHERE profile_id = $1 ORDER BY event_date DESC NULLS LAST`,
    [profileId]
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
  const { rows } = await pool.query(
    `SELECT * FROM scanned_organizations WHERE profile_id = $1 ORDER BY type, name`,
    [profileId]
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
  source: string
  created_at: string
}

export async function getEvents(profileId: string, date?: string): Promise<Event[]> {
  const pool = getPool()
  if (date) {
    const { rows } = await pool.query<Event>(
      `SELECT * FROM events WHERE profile_id = $1 AND event_date = $2 ORDER BY start_time NULLS LAST, created_at`,
      [profileId, date]
    )
    return rows
  }
  const { rows } = await pool.query<Event>(
    `SELECT * FROM events WHERE profile_id = $1 AND event_date >= CURRENT_DATE ORDER BY event_date, start_time NULLS LAST LIMIT 50`,
    [profileId]
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
  source?: string
}): Promise<Event> {
  const pool = getPool()
  const { rows } = await pool.query<Event>(
    `INSERT INTO events (profile_id, title, event_date, start_time, end_time, description, member_name, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [profileId, data.title, data.event_date, data.start_time ?? null, data.end_time ?? null,
     data.description ?? null, data.member_name ?? null, data.source ?? "manual"]
  )
  return rows[0]
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
  // Load existing events for deduplication
  const { rows: existing } = await pool.query<{ title: string; event_date: string }>(
    `SELECT title, event_date FROM events WHERE profile_id = $1`,
    [profileId]
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
      [profileId, ev.title, ev.event_date, ev.start_time, ev.end_time, ev.description, memberName]
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
}): Promise<Event | null> {
  const pool = getPool()
  const allowed = [
    "title",
    "event_date",
    "start_time",
    "end_time",
    "description",
    "member_name",
  ] as const
  const keys = allowed.filter((key) => key in data)

  if (keys.length === 0) {
    const { rows } = await pool.query<Event>(
      `SELECT * FROM events WHERE id = $1 AND profile_id = $2`,
      [id, profileId]
    )
    return rows[0] ?? null
  }

  const setClauses = keys.map((key, index) => `"${key}" = $${index + 3}`)
  const values = keys.map((key) => data[key] ?? null)
  const { rows } = await pool.query<Event>(
    `UPDATE events SET ${setClauses.join(", ")}
     WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, profileId, ...values]
  )
  return rows[0] ?? null
}

export async function deleteEvent(id: string, profileId: string) {
  const pool = getPool()
  await pool.query(`DELETE FROM events WHERE id = $1 AND profile_id = $2`, [id, profileId])
}

export interface Task {
  id: string
  profile_id: string
  title: string
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export async function getTasks(profileId: string): Promise<Task[]> {
  const pool = getPool()
  const { rows } = await pool.query<Task>(
    `SELECT * FROM tasks WHERE profile_id = $1 ORDER BY completed ASC, due_date NULLS LAST, created_at DESC`,
    [profileId]
  )
  return rows
}

export async function createTask(profileId: string, data: {
  title: string
  due_date?: string | null
}): Promise<Task> {
  const pool = getPool()
  const { rows } = await pool.query<Task>(
    `INSERT INTO tasks (profile_id, title, due_date) VALUES ($1,$2,$3) RETURNING *`,
    [profileId, data.title, data.due_date ?? null]
  )
  return rows[0]
}

export async function toggleTask(id: string, profileId: string, completed: boolean): Promise<Task | null> {
  const pool = getPool()
  const { rows } = await pool.query<Task>(
    `UPDATE tasks SET completed = $3, completed_at = $4 WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, profileId, completed, completed ? new Date().toISOString() : null]
  )
  return rows[0] ?? null
}

export async function deleteTask(id: string, profileId: string) {
  const pool = getPool()
  await pool.query(`DELETE FROM tasks WHERE id = $1 AND profile_id = $2`, [id, profileId])
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
  const { rows } = await pool.query<Expense & { expense_date: string | Date; amount: string | number }>(
    `SELECT * FROM expenses WHERE profile_id = $1 ORDER BY expense_date DESC, created_at DESC LIMIT 200`,
    [profileId]
  )
  return rows.map((r) => ({
    ...r,
    expense_date: r.expense_date instanceof Date ? r.expense_date.toISOString().split("T")[0] : String(r.expense_date).slice(0, 10),
    amount: Number(r.amount),
  }))
}

export async function createExpense(profileId: string, data: {
  title: string; amount: number; category?: string | null; expense_date: string; notes?: string | null
}): Promise<Expense> {
  const pool = getPool()
  const { rows } = await pool.query(
    `INSERT INTO expenses (profile_id, title, amount, category, expense_date, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [profileId, data.title, data.amount, data.category ?? null, data.expense_date, data.notes ?? null]
  )
  const r = rows[0]
  return { ...r, expense_date: String(r.expense_date).slice(0, 10), amount: Number(r.amount) }
}

export async function deleteExpense(id: string, profileId: string) {
  const pool = getPool()
  await pool.query(`DELETE FROM expenses WHERE id = $1 AND profile_id = $2`, [id, profileId])
}

// ── Family Facts ──────────────────────────────────────────────────────────────

export async function getFamilyFacts(profileId: string): Promise<FamilyFact[]> {
  const pool = getPool()
  const { rows } = await pool.query<FamilyFact & {
    source_email_ids: string[] | null
    first_seen: string | Date
    last_confirmed: string | Date
  }>(
    `SELECT * FROM family_facts WHERE profile_id = $1 ORDER BY subject, predicate, confidence DESC`,
    [profileId]
  )
  return rows.map((r) => ({
    ...r,
    source_email_ids: r.source_email_ids ?? [],
    first_seen: r.first_seen instanceof Date ? r.first_seen.toISOString() : r.first_seen,
    last_confirmed: r.last_confirmed instanceof Date ? r.last_confirmed.toISOString() : r.last_confirmed,
  }))
}

export async function upsertFacts(profileId: string, facts: RawFact[]): Promise<void> {
  if (facts.length === 0) return
  const pool = getPool()
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
      [profileId, f.subject, f.subject_type, f.predicate, f.object, f.confidence, emailId]
    )
  }
}

export async function updateFactStatus(
  profileId: string,
  id: string,
  status: "confirmed" | "uncertain" | "conflicted"
): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE family_facts SET status = $3 WHERE id = $1 AND profile_id = $2`,
    [id, profileId, status]
  )
}

export async function deleteFact(id: string, profileId: string): Promise<void> {
  const pool = getPool()
  await pool.query(`DELETE FROM family_facts WHERE id = $1 AND profile_id = $2`, [id, profileId])
}

export async function updateFactObject(id: string, profileId: string, object: string): Promise<void> {
  const pool = getPool()
  await pool.query(
    `UPDATE family_facts SET object = $3, status = 'confirmed' WHERE id = $1 AND profile_id = $2`,
    [id, profileId, object]
  )
}
