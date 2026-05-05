import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createFamilyInvite, getFamilyInvites, getHouseholdRole } from "@/lib/db"
import { canManageInvites } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const invites = await getFamilyInvites(session.profileId)
  return NextResponse.json({ invites })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageInvites(role)) {
    return NextResponse.json({ error: "Only the household owner can send invites." }, { status: 403 })
  }

  const body = await req.json()
  const email = String(body.invitee_email ?? "").trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }

  const invite = await createFamilyInvite(session.profileId, {
    invitee_email: email,
    invited_name: body.invited_name ? String(body.invited_name).trim() : null,
    relation: body.relation ?? "family_member",
    role: body.role ?? "member",
  })
  return NextResponse.json({ invite }, { status: 201 })
}
