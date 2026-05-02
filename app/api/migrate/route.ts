import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPool } from "@/lib/supabase"

export async function POST() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pool = getPool()
  try {
    await pool.query(`
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS first_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS last_name  TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS school_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS grade TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS daycare_name TEXT;
      ALTER TABLE kids ADD COLUMN IF NOT EXISTS daycare_address TEXT;

      CREATE TABLE IF NOT EXISTS pets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id TEXT NOT NULL,
        name TEXT NOT NULL,
        animal_type TEXT NOT NULL,
        breed TEXT,
        dob DATE,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_name TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence TEXT;

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
    `)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
