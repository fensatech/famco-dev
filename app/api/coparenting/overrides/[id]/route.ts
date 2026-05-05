import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { deleteCoParentingOverride, getHouseholdRole } from "@/lib/db"
import { canManageCoParenting } from "@/lib/permissions"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageCoParenting(role)) {
    return NextResponse.json({ error: "You have read-only access for co-parenting changes." }, { status: 403 })
  }
  const { id } = await params
  await deleteCoParentingOverride(id, session.profileId)
  return NextResponse.json({ ok: true })
}
