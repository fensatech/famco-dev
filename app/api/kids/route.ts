import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getKids, replaceKids, updateProfile } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const kids = await getKids(session.profileId)
  return NextResponse.json(kids)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { kids: { name: string; dob: string | null }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.kids)) {
    return NextResponse.json({ error: "kids must be an array" }, { status: 400 })
  }

  // Validate kids array
  for (const kid of body.kids) {
    if (typeof kid.name !== "string" || !kid.name.trim()) {
      return NextResponse.json({ error: "Each kid must have a name" }, { status: 400 })
    }
  }

  try {
    await replaceKids(
      session.profileId,
      body.kids.map((k) => ({
        name: k.name.trim(),
        dob: k.dob || null,
      }))
    )
    // Mark onboarding complete
    await updateProfile(session.profileId, {
      onboarding_completed: true,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
