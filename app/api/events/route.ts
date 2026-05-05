import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createEvent, getEvents, getHouseholdRole } from "@/lib/db"
import { canManageSharedCalendar } from "@/lib/permissions"

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
  const { title, event_date, start_time, end_time, description, member_name, reminder_offset_minutes, source } = body
  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 })
  }
  const event = await createEvent(session.profileId, { title: title.trim(), event_date, start_time, end_time, description, member_name: member_name ?? null, reminder_offset_minutes, source: source ?? "manual" })
  return NextResponse.json({ event }, { status: 201 })
}
