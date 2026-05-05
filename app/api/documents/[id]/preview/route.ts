import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getDocumentById } from "@/lib/db"
import { downloadFromBlob } from "@/lib/storage"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const document = await getDocumentById(id, session.profileId)
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const { buffer, contentType } = await downloadFromBlob(document.storage_path)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType ?? document.content_type ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${document.file_name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    console.error("[documents/preview] blob:", error)
    return NextResponse.json({ error: "Unable to preview document" }, { status: 500 })
  }
}
