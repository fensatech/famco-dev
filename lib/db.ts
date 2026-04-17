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
