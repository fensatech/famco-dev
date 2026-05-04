import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteDocument, ensureRuntimeSchema, getDocumentById } from "@/lib/db"
import { deleteFromBlob } from "@/lib/storage"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureRuntimeSchema().catch(() => {})
  const { id } = await params
  const document = await getDocumentById(id, session.profileId)
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  try {
    await deleteFromBlob(document.storage_path)
  } catch (error) {
    console.error("[documents/delete] blob:", error)
  }
  await deleteDocument(id, session.profileId)
  return NextResponse.json({ ok: true })
}
