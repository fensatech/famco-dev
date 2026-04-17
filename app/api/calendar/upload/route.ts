import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { uploadToBlob } from "@/lib/storage"
import { saveCalendar } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!file.name.endsWith(".ics")) {
    return NextResponse.json(
      { error: "Only .ics calendar files are supported" },
      { status: 400 }
    )
  }

  const maxSize = 5 * 1024 * 1024 // 5 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const blobPath = `${session.profileId}/${Date.now()}_${safeName}`

  try {
    await uploadToBlob(blobPath, buffer, "text/calendar")
  } catch (err) {
    console.error("[calendar/upload] blob:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  try {
    await saveCalendar({
      profile_id: session.profileId,
      kid_id: null,
      filename: safeName,
      storage_path: blobPath,
    })
  } catch (err) {
    console.error("[calendar/upload] db:", err)
    // Blob upload succeeded — non-critical if DB record fails
  }

  return NextResponse.json({ ok: true, filename: safeName })
}
