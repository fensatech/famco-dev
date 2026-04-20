import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { deleteEvent } from "@/lib/db"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await deleteEvent(id, session.profileId)
  return NextResponse.json({ ok: true })
}
