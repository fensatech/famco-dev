import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createReminder, getReminders } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const reminders = await getReminders(session.profileId)
  return NextResponse.json({ reminders })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const title = String(body.title ?? "").trim()
  const remindAt = String(body.remind_at ?? "").trim()
  if (!title || !remindAt) {
    return NextResponse.json({ error: "title and remind_at are required" }, { status: 400 })
  }

  const reminder = await createReminder(session.profileId, {
    source_type: body.source_type ?? "manual",
    source_id: body.source_id ? String(body.source_id) : null,
    title,
    note: body.note ? String(body.note) : null,
    remind_at: remindAt,
  })
  return NextResponse.json({ reminder }, { status: 201 })
}
