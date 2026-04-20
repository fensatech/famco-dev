import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.provider !== "google") return NextResponse.json({ events: [] })
  if (!session.accessToken || session.tokenExpired) {
    return NextResponse.json({ error: "token_expired" }, { status: 401 })
  }

  try {
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

    const events = (res.data.items ?? []).map((ev) => ({
      id: ev.id,
      title: ev.summary ?? "(No title)",
      start: ev.start?.dateTime ?? ev.start?.date ?? null,
      end: ev.end?.dateTime ?? ev.end?.date ?? null,
      allDay: !ev.start?.dateTime,
      location: ev.location ?? null,
      description: ev.description ?? null,
    }))

    return NextResponse.json({ events })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    console.error("[gcal]", msg)
    // Treat Google auth errors as 401 so the client can prompt re-login
    if (msg.includes("invalid_grant") || msg.includes("Invalid Credentials") || msg.includes("invalid authentication")) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 })
    }
    return NextResponse.json({ error: "gcal_error" }, { status: 500 })
  }
}
