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

  let body: { kids: { name: string; first_name?: string | null; last_name?: string | null; dob: string | null; school_name?: string | null; grade?: string | null; daycare_name?: string | null; daycare_address?: string | null }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!Array.isArray(body.kids)) {
    return NextResponse.json({ error: "kids must be an array" }, { status: 400 })
  }

  try {
    await replaceKids(
      session.profileId,
      body.kids
        .filter((k) => (k.first_name ?? k.name ?? "").trim())
        .map((k) => {
          const firstName = (k.first_name ?? "").trim()
          const lastName = (k.last_name ?? "").trim()
          const fullName = [firstName, lastName].filter(Boolean).join(" ") || k.name?.trim() || firstName
          return {
            name: fullName,
            first_name: firstName || null,
            last_name: lastName || null,
            dob: k.dob || null,
            school_name: k.school_name?.trim() || null,
            grade: k.grade?.trim() || null,
            daycare_name: k.daycare_name?.trim() || null,
            daycare_address: k.daycare_address?.trim() || null,
          }
        })
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
