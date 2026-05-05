import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createTask, getHouseholdRole, getTasks } from "@/lib/db"
import { canManageTasks } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tasks = await getTasks(session.profileId)
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageTasks(role)) {
    return NextResponse.json({ error: "You have read-only access for household tasks." }, { status: 403 })
  }
  const body = await req.json()
  const { title, due_date, due_time, notes, assignee_name, recurrence, reminder_offset_minutes } = body
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 })
  const task = await createTask(session.profileId, {
    title: title.trim(),
    due_date,
    due_time,
    notes: notes || null,
    assignee_name: assignee_name || null,
    recurrence: recurrence || null,
    reminder_offset_minutes,
  })
  return NextResponse.json({ task }, { status: 201 })
}
