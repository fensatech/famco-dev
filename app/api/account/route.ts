import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteAccount, ensureRuntimeSchema, getStoredFilePathsForAccount } from "@/lib/db"
import { deleteFromBlob } from "@/lib/storage"

export async function DELETE() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureRuntimeSchema().catch(() => {})
    const storedPaths = await getStoredFilePathsForAccount(session.profileId).catch(() => [])
    for (const path of storedPaths) {
      try {
        await deleteFromBlob(path)
      } catch (error) {
        console.error("[account/delete/blob]", error)
      }
    }
    const result = await deleteAccount(session.profileId)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
