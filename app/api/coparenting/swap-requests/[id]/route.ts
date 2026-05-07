import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getCoParentingOverrides, getCoParentingSchedule, getHouseholdRole, resolveCoParentingSwapRequest } from "@/lib/db"
import { canResolveSwapRequests } from "@/lib/permissions"
import { sendEmail, swapResolvedHtml } from "@/lib/email"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canResolveSwapRequests(role)) {
    return NextResponse.json({ error: "You do not have permission to resolve swap requests." }, { status: 403 })
  }

  const body = await req.json()
  const status = body.status === "approved" || body.status === "declined" ? body.status : null
  if (!status) {
    return NextResponse.json({ error: "status must be approved or declined" }, { status: 400 })
  }

  const { id } = await params
  const request = await resolveCoParentingSwapRequest(session.profileId, id, {
    status,
    decision_note: typeof body.decision_note === "string" ? body.decision_note.trim() || null : null,
  })
  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const schedule = await getCoParentingSchedule(session.profileId)
  const overrides = schedule ? await getCoParentingOverrides(session.profileId, schedule.id) : []

  // Notify co-parent of the decision
  if (schedule?.coparent_email) {
    void sendEmail(
      schedule.coparent_email,
      `Swap request ${status} — Famco`,
      swapResolvedHtml({ date: request.requested_date, status, decisionNote: request.decision_note }),
    )
  }

  return NextResponse.json({ request, overrides })
}
