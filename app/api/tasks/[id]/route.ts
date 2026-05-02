import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { toggleTask, deleteTask, updateTask } from "@/lib/db"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  if (body.completed !== undefined) {
    const result = await toggleTask(id, session.profileId, !!body.completed)
    if (!result.task) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(result)
  }

  const task = await updateTask(id, session.profileId, {
    title: body.title,
    due_date: body.due_date ?? null,
    due_time: body.due_time ?? null,
    notes: body.notes ?? null,
    assignee_name: body.assignee_name ?? null,
    recurrence: body.recurrence ?? null,
  })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ task })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await deleteTask(id, session.profileId)
  return NextResponse.json({ ok: true })
}
