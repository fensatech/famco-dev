import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getProfile, updateProfile } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const profile = await getProfile(session.profileId)
  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Strip unknown fields — only allow safe profile columns
  const allowed = [
    "first_name",
    "last_name",
    "city",
    "timezone",
    "phone",
    "family_type",
    "co_parent_email",
    "partner_name",
    "onboarding_step",
    "onboarding_completed",
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  try {
    await updateProfile(session.profileId, updates)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
