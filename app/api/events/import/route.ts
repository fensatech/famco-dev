import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { importIcsEvents } from "@/lib/db"
import { getPool } from "@/lib/supabase"
import type { IcsEvent } from "@/lib/db"

// Run the migration inline on first call (idempotent ALTER TABLE)
async function ensureColumns() {
  const pool = getPool()
  await pool.query(`
    ALTER TABLE events ADD COLUMN IF NOT EXISTS member_name TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';
  `)
}

function parseDate(dtstart: string): { date: string; time: string | null } {
  // DTSTART;TZID=...:20250915T090000 or DTSTART:20250915 or DTSTART:20250915T090000Z
  const value = dtstart.includes(":") ? dtstart.split(":").slice(1).join(":") : dtstart
  if (value.length === 8) {
    // All-day: YYYYMMDD
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, time: null }
  }
  const y = value.slice(0, 4), mo = value.slice(4, 6), d = value.slice(6, 8)
  const h = value.slice(9, 11), mi = value.slice(11, 13)
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` }
}

function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "")
}

function decodeIcsText(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
}

export function parseIcs(icsText: string): IcsEvent[] {
  const lines = unfoldIcs(icsText).split("\n")
  const events: IcsEvent[] = []
  let current: Partial<IcsEvent & { dtstart: string; dtend: string }> | null = null

  for (const line of lines) {
    const [key, ...rest] = line.split(":")
    const value = rest.join(":")

    if (line.startsWith("BEGIN:VEVENT")) {
      current = {}
    } else if (line.startsWith("END:VEVENT") && current) {
      if (current.dtstart) {
        const { date, time } = parseDate(current.dtstart)
        const endParsed = current.dtend ? parseDate(current.dtend) : null
        events.push({
          title: current.title ?? "(No title)",
          event_date: date,
          start_time: time,
          end_time: endParsed?.time ?? null,
          description: current.description ?? null,
        })
      }
      current = null
    } else if (current) {
      const upperKey = key.split(";")[0].toUpperCase()
      if (upperKey === "SUMMARY") current.title = decodeIcsText(value.trim())
      else if (upperKey === "DESCRIPTION") current.description = decodeIcsText(value.trim()).slice(0, 500)
      else if (upperKey === "DTSTART") current.dtstart = line
      else if (upperKey === "DTEND") current.dtend = line
    }
  }

  return events
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { icsText, memberName } = await req.json()
  if (!icsText || !memberName) {
    return NextResponse.json({ error: "icsText and memberName required" }, { status: 400 })
  }

  try {
    await ensureColumns()
    const parsed = parseIcs(icsText)
    if (parsed.length === 0) return NextResponse.json({ error: "No events found in file" }, { status: 400 })
    const result = await importIcsEvents(session.profileId, parsed, memberName)
    return NextResponse.json({ ok: true, ...result, total: parsed.length })
  } catch (err) {
    console.error("[ics import]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  }
}
