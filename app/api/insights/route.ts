import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { getScannedEvents } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const events = await getScannedEvents(session.profileId)
  return NextResponse.json({ events })
}
