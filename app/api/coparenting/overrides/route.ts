import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createCoParentingOverride } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { schedule_id, override_date, assigned_to, note } = body
  if (!schedule_id || !override_date || !assigned_to) {
    return NextResponse.json({ error: "schedule_id, override_date, and assigned_to are required" }, { status: 400 })
  }
  const override = await createCoParentingOverride(session.profileId, {
    schedule_id,
    override_date,
    assigned_to,
    note: note || null,
  })
  return NextResponse.json({ override }, { status: 201 })
}
