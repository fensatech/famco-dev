import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getHouseholdRole, getPets, replacePets } from "@/lib/db"
import { canEditHousehold } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const pets = await getPets(session.profileId)
  return NextResponse.json({ pets })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canEditHousehold(role)) {
    return NextResponse.json({ error: "You have read-only access for household settings." }, { status: 403 })
  }
  const body = await req.json()
  if (!Array.isArray(body.pets)) return NextResponse.json({ error: "pets must be an array" }, { status: 400 })
  await replacePets(session.profileId, body.pets)
  return NextResponse.json({ ok: true })
}
