import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { revokeFamilyInvite } from "@/lib/db"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await revokeFamilyInvite(session.profileId, id)
  return NextResponse.json({ ok: true })
}
