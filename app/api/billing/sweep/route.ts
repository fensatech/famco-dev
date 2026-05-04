import { NextRequest, NextResponse } from "next/server"
import { deleteAccount, ensureRuntimeSchema, getExpiredUnpaidHouseholdRoots, getStoredFilePathsForAccount } from "@/lib/db"
import { billingEnforcementEnabled } from "@/lib/billing"
import { deleteFromBlob } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.BILLING_SWEEP_SECRET?.trim()
  const incomingSecret = req.headers.get("x-billing-sweep-secret")?.trim()

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureRuntimeSchema().catch(() => {})

  if (!billingEnforcementEnabled()) {
    return NextResponse.json({ ok: true, enforcement: false, deletedHouseholds: 0 })
  }

  const expiredRoots = await getExpiredUnpaidHouseholdRoots()
  let deletedHouseholds = 0

  for (const rootId of expiredRoots) {
    const storedPaths = await getStoredFilePathsForAccount(rootId).catch(() => [])
    for (const path of storedPaths) {
      try {
        await deleteFromBlob(path)
      } catch (error) {
        console.error("[billing/sweep/blob]", error)
      }
    }
    await deleteAccount(rootId, "expired_unpaid")
    deletedHouseholds += 1
  }

  return NextResponse.json({ ok: true, enforcement: true, deletedHouseholds })
}
