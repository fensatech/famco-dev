import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { canEditHousehold } from "@/lib/permissions"
import { ensureRuntimeSchema, getHouseholdRole, upsertScannedEventAction } from "@/lib/db"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureRuntimeSchema().catch(() => {})
  const role = await getHouseholdRole(session.profileId)
  if (!canEditHousehold(role)) {
    return NextResponse.json({ error: "You have read-only access for household insights." }, { status: 403 })
  }

  const body = await req.json()
  const scannedEventId = String(body.scanned_event_id ?? "").trim()
  if (!scannedEventId) {
    return NextResponse.json({ error: "scanned_event_id is required" }, { status: 400 })
  }

  const status = body.status === "handled" || body.status === "new" ? body.status : undefined
  const assignedTo =
    body.assigned_to === null || typeof body.assigned_to === "string"
      ? (body.assigned_to ? String(body.assigned_to).trim() : null)
      : undefined
  const lastAction =
    body.last_action === "calendar" ||
    body.last_action === "task" ||
    body.last_action === "reminder" ||
    body.last_action === "handled" ||
    body.last_action === null
      ? body.last_action
      : undefined
  const correctedMemberName =
    body.corrected_member_name === null || typeof body.corrected_member_name === "string"
      ? (body.corrected_member_name ? String(body.corrected_member_name).trim() : null)
      : undefined
  const correctedMemberType =
    body.corrected_member_type === "adult" ||
    body.corrected_member_type === "child" ||
    body.corrected_member_type === "pet" ||
    body.corrected_member_type === "family" ||
    body.corrected_member_type === null
      ? body.corrected_member_type
      : undefined
  const correctedEventType =
    [
      "calendar_invite",
      "appointment",
      "school_event",
      "medical",
      "field_trip",
      "no_school",
      "special_day",
      "activity",
      "recital",
      "subscription",
      "invoice",
      "bill",
      "other",
      null,
    ].includes(body.corrected_event_type)
      ? body.corrected_event_type
      : undefined
  const relevance =
    body.relevance === "relevant" ||
    body.relevance === "not_relevant" ||
    body.relevance === "needs_review"
      ? body.relevance
      : undefined

  const action = await upsertScannedEventAction(session.profileId, scannedEventId, {
    status,
    assigned_to: assignedTo,
    last_action: lastAction,
    corrected_member_name: correctedMemberName,
    corrected_member_type: correctedMemberType,
    corrected_event_type: correctedEventType,
    relevance,
  })

  return NextResponse.json({ action })
}
