import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getTasks, createTask } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tasks = await getTasks(session.profileId)
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { title, due_date } = body
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 })
  const task = await createTask(session.profileId, { title: title.trim(), due_date })
  return NextResponse.json({ task }, { status: 201 })
}
