import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { dismissReminder, snoozeReminder } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.action === "dismiss") {
    await dismissReminder(id, session.profileId)
    return NextResponse.json({ ok: true })
  }

  if (body.action === "snooze") {
    const remindAt = String(body.remind_at ?? "").trim()
    if (!remindAt) return NextResponse.json({ error: "remind_at is required" }, { status: 400 })
    const reminder = await snoozeReminder(id, session.profileId, remindAt)
    if (!reminder) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ reminder })
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
}
