import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getCoParentingSchedule, getCoParentingOverrides, upsertCoParentingSchedule } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schedule = await getCoParentingSchedule(session.profileId)
  const overrides = schedule ? await getCoParentingOverrides(session.profileId, schedule.id) : []
  return NextResponse.json({ schedule, overrides })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { schedule_type, start_date, exchange_time, exchange_location, parent_a_name, parent_b_name, kid_ids } = body
  if (!schedule_type || !start_date) return NextResponse.json({ error: "schedule_type and start_date are required" }, { status: 400 })
  const schedule = await upsertCoParentingSchedule(session.profileId, {
    schedule_type,
    start_date,
    exchange_time: exchange_time || null,
    exchange_location: exchange_location || null,
    parent_a_name: parent_a_name || "Parent A",
    parent_b_name: parent_b_name || "Parent B",
    kid_ids: Array.isArray(kid_ids) ? kid_ids : [],
  })
  const overrides = await getCoParentingOverrides(session.profileId, schedule.id)
  return NextResponse.json({ schedule, overrides }, { status: 201 })
}
