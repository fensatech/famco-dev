import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createDocument, ensureRuntimeSchema, getDocuments, getHouseholdRole } from "@/lib/db"
import { canManageDocuments } from "@/lib/permissions"
import { uploadToBlob } from "@/lib/storage"
import type { FamilyDocumentCategory } from "@/types"

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"]
const ALLOWED_CATEGORIES: FamilyDocumentCategory[] = ["school", "medical", "insurance", "id", "household", "pet", "finance", "other"]

export async function GET() {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  await ensureRuntimeSchema().catch(() => {})
  const documents = await getDocuments(session.profileId)
  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = await getHouseholdRole(session.profileId)
  if (!canManageDocuments(role)) {
    return NextResponse.json({ error: "You have read-only access for shared documents." }, { status: 403 })
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

  const lowerName = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  const category = String(formData.get("category") ?? "other") as FamilyDocumentCategory
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  const title = String(formData.get("title") ?? "").trim() || file.name.replace(/\.[^.]+$/, "")
  const memberName = String(formData.get("member_name") ?? "").trim() || null
  const notes = String(formData.get("notes") ?? "").trim() || null
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const blobPath = `${session.profileId}/documents/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadToBlob(blobPath, buffer, file.type || "application/octet-stream")
  } catch (error) {
    console.error("[documents/upload] blob:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  try {
    await ensureRuntimeSchema().catch(() => {})
    const document = await createDocument(session.profileId, {
      title,
      file_name: safeName,
      storage_path: blobPath,
      content_type: file.type || "application/octet-stream",
      byte_size: file.size,
      category,
      member_name: memberName,
      notes,
    })
    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("[documents/upload] db:", error)
    return NextResponse.json({ error: "Unable to save document metadata" }, { status: 500 })
  }
}
