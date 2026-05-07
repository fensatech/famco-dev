import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { billingEnforcementEnabled, getTrialStartedAt, getTrialWindow, isSyncAllowedForProfile } from "@/lib/billing"
import {
  ensureRuntimeSchema,
  getGoogleCalendarEventOverrides,
  getGoogleCalendarPreferences,
  getHouseholdRole,
  getPrimaryHouseholdProfile,
  setGoogleCalendarVisibility,
  upsertGoogleCalendarEventOverride,
} from "@/lib/db"
import { canManageSharedCalendar } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.provider !== "google") return NextResponse.json({ events: [] })
  if (!session.accessToken || session.tokenExpired) {
    return NextResponse.json({ error: "token_expired" }, { status: 401 })
  }

  try {
    await ensureRuntimeSchema().catch(() => {})
    const billingProfile = await getPrimaryHouseholdProfile(session.profileId)
    if (billingEnforcementEnabled() && billingProfile && !isSyncAllowedForProfile(billingProfile)) {
      const trialWindow = getTrialWindow(getTrialStartedAt(billingProfile))
      return NextResponse.json(
        {
          error: "billing_required",
          billing_status: trialWindow.status,
          trial_ends_at: trialWindow.trialEndsAt,
          access_ends_at: trialWindow.graceEndsAt,
        },
        { status: 402 },
      )
    }

    const preferences = await getGoogleCalendarPreferences(session.profileId)
    if (!preferences.visible) {
      return NextResponse.json({ events: [], visible: false })
    }

    const auth2 = new google.auth.OAuth2()
    auth2.setCredentials({ access_token: session.accessToken })
    const calendar = google.calendar({ version: "v3", auth: auth2 })

    const timeMin = req.nextUrl.searchParams.get("timeMin") ?? new Date().toISOString()
    const timeMax = req.nextUrl.searchParams.get("timeMax") ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    })

    const overrides = await getGoogleCalendarEventOverrides(session.profileId)
    const overrideMap = new Map(overrides.map((override) => [override.external_event_id, override]))

    const events = (res.data.items ?? []).map((ev) => {
      const override = ev.id ? overrideMap.get(ev.id) : undefined
      return {
      id: ev.id,
      title: ev.summary ?? "(No title)",
      start: ev.start?.dateTime ?? ev.start?.date ?? null,
      end: ev.end?.dateTime ?? ev.end?.date ?? null,
      allDay: !ev.start?.dateTime,
      location: ev.location ?? null,
      description: ev.description ?? null,
      member_name: override?.member_name ?? null,
      hidden: override?.hidden ?? false,
    }}).filter((event) => !event.hidden)

    return NextResponse.json({ events, visible: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("[gcal]", msg)
    // Treat Google auth errors as 401 so the client can prompt re-login
    if (
      msg.includes("invalid_grant") || msg.includes("Invalid Credentials") ||
      msg.includes("invalid authentication") || msg.includes("Token has been expired") ||
      msg.includes("UNAUTHENTICATED") || msg.includes("unauthorized") ||
      msg.includes("access_denied") || msg.includes("invalid_token")
    ) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 })
    }
    return NextResponse.json({ error: "gcal_error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.provider !== "google") return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })

  await ensureRuntimeSchema().catch(() => {})
  const role = await getHouseholdRole(session.profileId)
  if (!canManageSharedCalendar(role)) {
    return NextResponse.json({ error: "You have read-only access for shared calendar changes." }, { status: 403 })
  }

  const body = await req.json()

  if (body.scope === "feed") {
    const preference = await setGoogleCalendarVisibility(session.profileId, body.visible !== false)
    return NextResponse.json({ visible: preference.visible })
  }

  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : ""
  if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 })

  const updates: { member_name?: string | null; hidden?: boolean } = {}
  if ("member_name" in body) {
    updates.member_name = typeof body.member_name === "string" && body.member_name.trim()
      ? body.member_name.trim()
      : null
  }
  if ("hidden" in body) updates.hidden = Boolean(body.hidden)

  const override = await upsertGoogleCalendarEventOverride(session.profileId, eventId, updates)
  return NextResponse.json({ override })
}
