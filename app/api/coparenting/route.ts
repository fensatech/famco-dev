import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getCoParentingOverrides, getCoParentingSchedule, getCoParentingSwapRequests, getHouseholdRole, upsertCoParentingSchedule } from "@/lib/db"
import { canManageCoParenting } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const schedule = await getCoParentingSchedule(session.profileId)
  const overrides = schedule ? await getCoParentingOverrides(session.profileId, schedule.id) : []
  const swapRequests = schedule ? await getCoParentingSwapRequests(session.profileId, schedule.id) : []
  return NextResponse.json({ schedule, overrides, swapRequests })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageCoParenting(role)) {
    return NextResponse.json({ error: "You have read-only access for co-parenting changes." }, { status: 403 })
  }
  const body = await req.json()
  const { schedule_type, start_date, exchange_time, exchange_location, parent_a_name, parent_b_name, kid_ids, coparent_email } = body
  if (!schedule_type || !start_date) return NextResponse.json({ error: "schedule_type and start_date are required" }, { status: 400 })
  const schedule = await upsertCoParentingSchedule(session.profileId, {
    schedule_type,
    start_date,
    exchange_time: exchange_time || null,
    exchange_location: exchange_location || null,
    parent_a_name: parent_a_name || "Parent A",
    parent_b_name: parent_b_name || "Parent B",
    kid_ids: Array.isArray(kid_ids) ? kid_ids : [],
    coparent_email: coparent_email || null,
  })
  const overrides = await getCoParentingOverrides(session.profileId, schedule.id)
  const swapRequests = await getCoParentingSwapRequests(session.profileId, schedule.id)
  return NextResponse.json({ schedule, overrides, swapRequests }, { status: 201 })
}
