import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getEvents, createEvent } from "@/lib/db"

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
  const body = await req.json()
  const { title, event_date, start_time, end_time, description } = body
  if (!title?.trim() || !event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 })
  }
  const event = await createEvent(session.profileId, { title: title.trim(), event_date, start_time, end_time, description })
  return NextResponse.json({ event }, { status: 201 })
}
