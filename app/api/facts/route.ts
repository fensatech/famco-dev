import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getFamilyFacts, getScannedEvents, getKids, upsertFacts, getFamilyFacts as loadFacts, updateFactStatus } from "@/lib/db"
import { seedFactsFromEvents, resolveConflicts } from "@/lib/facts"
import type { Kid } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let facts = await getFamilyFacts(session.profileId)

  // Auto-seed on first load if facts table is empty but scanned_events has data
  if (facts.length === 0) {
    const [events, kids] = await Promise.all([
      getScannedEvents(session.profileId),
      getKids(session.profileId),
    ])
    if (events.length > 0) {
      const kidMembers = kids.map((k: Kid) => ({ name: k.name, type: "kid" as const, dob: k.dob ?? null }))
      const seeded = seedFactsFromEvents(events, kidMembers)
      if (seeded.length > 0) {
        await upsertFacts(session.profileId, seeded)
        facts = await loadFacts(session.profileId)
        // Run conflict resolution on freshly seeded facts
        const conflicts = resolveConflicts(facts, kids.map((k: Kid) => ({ name: k.name, dob: k.dob ?? null })))
        for (const { id, status } of conflicts) {
          await updateFactStatus(session.profileId, id, status)
        }
        facts = await loadFacts(session.profileId)
      }
    }
  }

  return NextResponse.json({ facts })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, object } = await req.json()
  if (!id || typeof object !== "string" || !object.trim()) return NextResponse.json({ error: "id and object required" }, { status: 400 })
  const { updateFactObject } = await import("@/lib/db")
  await updateFactObject(id, session.profileId, object.trim())
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const { deleteFact } = await import("@/lib/db")
  await deleteFact(id, session.profileId)
  return NextResponse.json({ ok: true })
}
