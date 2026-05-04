import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteAccount, ensureRuntimeSchema } from "@/lib/db"

export async function DELETE() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureRuntimeSchema().catch(() => {})
    const result = await deleteAccount(session.profileId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
