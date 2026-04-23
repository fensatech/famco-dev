import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { deleteEvent, updateEvent } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const event = await updateEvent(id, session.profileId, body)
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ event })
}

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
