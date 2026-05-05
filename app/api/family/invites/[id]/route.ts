import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getHouseholdRole, revokeFamilyInvite } from "@/lib/db"
import { canManageInvites } from "@/lib/permissions"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageInvites(role)) {
    return NextResponse.json({ error: "Only the household owner can manage invites." }, { status: 403 })
  }
  const { id } = await params
  await revokeFamilyInvite(session.profileId, id)
  return NextResponse.json({ ok: true })
}
