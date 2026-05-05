import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getHouseholdRole, getNotificationPreferences, upsertNotificationPreferences } from "@/lib/db"
import { canEditHousehold } from "@/lib/permissions"
import { normalizeReminderOffsetMinutes } from "@/lib/reminders"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const preferences = await getNotificationPreferences(session.profileId)
  return NextResponse.json({ preferences })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = await getHouseholdRole(session.profileId)
  if (!canEditHousehold(role)) {
    return NextResponse.json({ error: "You have read-only access for household settings." }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const preferences = await upsertNotificationPreferences(session.profileId, {
    browser_enabled: typeof body.browser_enabled === "boolean" ? body.browser_enabled : undefined,
    quiet_hours_enabled: typeof body.quiet_hours_enabled === "boolean" ? body.quiet_hours_enabled : undefined,
    quiet_hours_start: typeof body.quiet_hours_start === "string" ? body.quiet_hours_start || null : undefined,
    quiet_hours_end: typeof body.quiet_hours_end === "string" ? body.quiet_hours_end || null : undefined,
    default_event_offset_minutes:
      body.default_event_offset_minutes != null ? normalizeReminderOffsetMinutes(body.default_event_offset_minutes) : undefined,
    default_task_offset_minutes:
      body.default_task_offset_minutes != null ? normalizeReminderOffsetMinutes(body.default_task_offset_minutes) : undefined,
    default_school_offset_minutes:
      body.default_school_offset_minutes != null ? normalizeReminderOffsetMinutes(body.default_school_offset_minutes) : undefined,
    default_bill_offset_minutes:
      body.default_bill_offset_minutes != null ? normalizeReminderOffsetMinutes(body.default_bill_offset_minutes) : undefined,
    default_coparenting_offset_minutes:
      body.default_coparenting_offset_minutes != null ? normalizeReminderOffsetMinutes(body.default_coparenting_offset_minutes) : undefined,
  })

  return NextResponse.json({ preferences })
}
