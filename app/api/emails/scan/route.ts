import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { scanEmails } from "@/lib/gmail"
import { scanOutlookEmails } from "@/lib/outlook"
import { saveScannedEvents, saveScannedOrganizations } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 })

  const provider = session.provider

  if (provider !== "google" && provider !== "microsoft-entra-id") {
    return NextResponse.json({ ok: true, skipped: true, reason: "provider_not_supported" })
  }

  try {
    const result =
      provider === "google"
        ? await scanEmails(session.accessToken)
        : await scanOutlookEmails(session.accessToken)

    await Promise.all([
      saveScannedEvents(session.profileId, result.events),
      saveScannedOrganizations(
        session.profileId,
        result.organizations.map((o) => ({ name: o.name, type: o.type, email_domain: o.domain }))
      ),
    ])

    return NextResponse.json({
      ok: true,
      provider,
      events_found: result.events.length,
      organizations_found: result.organizations.length,
      by_type: result.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
        return acc
      }, {}),
    })
  } catch (err) {
    console.error("[emails/scan]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Scan failed" }, { status: 500 })
  }
}
