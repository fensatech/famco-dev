import { getPool } from "./supabase"
import type { Profile, Kid } from "@/types"

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
  kids: { name: string; dob: string | null }[]
) {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM kids WHERE profile_id = $1", [profileId])
    for (const kid of kids) {
      await client.query(
        "INSERT INTO kids (profile_id, name, dob) VALUES ($1, $2, $3)",
        [profileId, kid.name, kid.dob]
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

export async function saveScannedEvents(
  profileId: string,
  events: {
    gmail_message_id: string
    title: string
    event_date: string | null
    event_type: string
    organization_name: string | null
    organization_type: string | null
    source_from: string
    snippet: string
  }[]
) {
  if (events.length === 0) return
  const pool = getPool()
  for (const e of events) {
    await pool.query(
      `INSERT INTO scanned_events
         (profile_id, gmail_message_id, title, event_date, event_type,
          organization_name, organization_type, source_from, snippet)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (profile_id, gmail_message_id) DO NOTHING`,
      [profileId, e.gmail_message_id, e.title, e.event_date ?? null,
       e.event_type, e.organization_name, e.organization_type, e.source_from, e.snippet]
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
  return rows
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
}): Promise<Event> {
  const pool = getPool()
  const { rows } = await pool.query<Event>(
    `INSERT INTO events (profile_id, title, event_date, start_time, end_time, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [profileId, data.title, data.event_date, data.start_time ?? null, data.end_time ?? null, data.description ?? null]
  )
  return rows[0]
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

export async function toggleTask(id: string, profileId: string, completed: boolean): Promise<Task> {
  const pool = getPool()
  const { rows } = await pool.query<Task>(
    `UPDATE tasks SET completed = $3, completed_at = $4 WHERE id = $1 AND profile_id = $2 RETURNING *`,
    [id, profileId, completed, completed ? new Date().toISOString() : null]
  )
  return rows[0]
}

export async function deleteTask(id: string, profileId: string) {
  const pool = getPool()
  await pool.query(`DELETE FROM tasks WHERE id = $1 AND profile_id = $2`, [id, profileId])
}
