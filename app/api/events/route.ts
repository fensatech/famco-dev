import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createEvent, getEvents, getHouseholdRole } from "@/lib/db"
import { canManageSharedCalendar } from "@/lib/permissions"

const RECURRENCE_COUNTS: Record<string, number> = {
  daily: 14,
  weekly: 26,
  monthly: 12,
}

function addRecurrenceOffset(dateStr: string, recurrence: string, step: number): string {
  const d = new Date(dateStr + "T00:00:00Z")
  if (recurrence === "daily") d.setUTCDate(d.getUTCDate() + step)
  else if (recurrence === "weekly") d.setUTCDate(d.getUTCDate() + step * 7)
  else if (recurrence === "monthly") d.setUTCMonth(d.getUTCMonth() + step)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const date = req.nextUrl.searchParams.get("date") ?? undefined
  const events = await getEvents(session.profileId, date)
  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageSharedCalendar(role)) {
    return NextResponse.json({ error: "You have read-only access for shared calendar changes." }, { status: 403 })
  }
  const body = await req.json()
  const { title, event_date, start_time, end_time, description, member_name, reminder_offset_minutes, source, recurrence } = body
  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 })
  }

  const validRecurrence = recurrence && RECURRENCE_COUNTS[recurrence] ? recurrence : null

  if (!validRecurrence) {
    const event = await createEvent(session.profileId, {
      title: title.trim(), event_date, start_time, end_time, description,
      member_name: member_name ?? null, reminder_offset_minutes, source: source ?? "manual",
      recurrence: null,
    })
    return NextResponse.json({ event, events: [event] }, { status: 201 })
  }

  // Create the full recurring series
  const count = RECURRENCE_COUNTS[validRecurrence]
  const createdEvents = []
  for (let i = 0; i < count; i++) {
    const eventDate = addRecurrenceOffset(event_date, validRecurrence, i)
    const ev = await createEvent(session.profileId, {
      title: title.trim(), event_date: eventDate, start_time, end_time, description,
      member_name: member_name ?? null,
      reminder_offset_minutes: i === 0 ? reminder_offset_minutes : null,
      source: source ?? "manual",
      recurrence: validRecurrence,
    })
    createdEvents.push(ev)
  }

  return NextResponse.json({ event: createdEvents[0], events: createdEvents }, { status: 201 })
}
