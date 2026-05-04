import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { ensureRuntimeSchema, getDocumentById } from "@/lib/db"
import { downloadFromBlob } from "@/lib/storage"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { buffer, contentType } = await downloadFromBlob(document.storage_path)
    const body = Uint8Array.from(buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? document.content_type ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.file_name.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[documents/download] blob:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
