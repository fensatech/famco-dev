import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { ensureRuntimeSchema } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await ensureRuntimeSchema()
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
