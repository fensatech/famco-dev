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
    `)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
