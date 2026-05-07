import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createCoParentingSwapRequest, getCoParentingSchedule, getHouseholdRole } from "@/lib/db"
import { canManageCoParenting } from "@/lib/permissions"
import { sendEmail, swapCreatedHtml } from "@/lib/email"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageCoParenting(role)) {
    return NextResponse.json({ error: "You have read-only access for co-parenting changes." }, { status: 403 })
  }

  const body = await req.json()
  if (!body.schedule_id || !body.requested_date || !body.requested_by || !body.requested_to) {
    return NextResponse.json({ error: "schedule_id, requested_date, requested_by, and requested_to are required" }, { status: 400 })
  }

  const request = await createCoParentingSwapRequest(session.profileId, {
    schedule_id: String(body.schedule_id),
    requested_date: String(body.requested_date),
    requested_by: body.requested_by === "b" ? "b" : "a",
    requested_to: body.requested_to === "a" ? "a" : "b",
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  })

  // Send email notification to co-parent if email is configured
  const schedule = await getCoParentingSchedule(session.profileId)
  if (schedule?.coparent_email) {
    const requesterName = request.requested_by === "a" ? schedule.parent_a_name : schedule.parent_b_name
    void sendEmail(
      schedule.coparent_email,
      "Custody swap request from Famco",
      swapCreatedHtml({ requesterName, date: request.requested_date, note: request.note }),
    )
  }

  return NextResponse.json({ request }, { status: 201 })
}
