import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { scanEmailsForMeetings } from "@/lib/gmail"

export async function POST() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.provider !== "google") {
    return NextResponse.json(
      { error: "Email scanning is only available for Google accounts" },
      { status: 400 }
    )
  }

  if (!session.accessToken) {
    return NextResponse.json(
      { error: "No access token available. Please sign in again." },
      { status: 401 }
    )
  }

  try {
    const meetings = await scanEmailsForMeetings(session.accessToken)
    return NextResponse.json({ meetings })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[emails/scan]", msg)
    return NextResponse.json({ error: "Failed to scan emails" }, { status: 500 })
  }
}
