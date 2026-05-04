import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deleteAccount, ensureRuntimeSchema, getProfile, getStoredFilePathsForAccount } from "@/lib/db"
import type { DeletionFeedbackCategory } from "@/types"
import { deleteFromBlob } from "@/lib/storage"

const DELETION_FEEDBACK_CATEGORIES: DeletionFeedbackCategory[] = [
  "too_expensive",
  "not_useful",
  "missing_features",
  "too_many_bugs",
  "privacy_concern",
  "switching_tools",
  "other",
]

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureRuntimeSchema().catch(() => {})
    const body = await request.json().catch(() => ({}))
    const feedbackCategory =
      typeof body?.deletion_feedback_category === "string" &&
      DELETION_FEEDBACK_CATEGORIES.includes(body.deletion_feedback_category as DeletionFeedbackCategory)
        ? (body.deletion_feedback_category as DeletionFeedbackCategory)
        : null
    if (!feedbackCategory) {
      return NextResponse.json({ error: "Please select a deletion reason." }, { status: 400 })
    }
    const profile = await getProfile(session.profileId)
    const deletesWholeHousehold = !profile?.household_root_id || profile.household_root_id === session.profileId
    if (deletesWholeHousehold) {
      const storedPaths = await getStoredFilePathsForAccount(session.profileId).catch(() => [])
      for (const path of storedPaths) {
        try {
          await deleteFromBlob(path)
        } catch (error) {
          console.error("[account/delete/blob]", error)
        }
      }
    }
    const result = await deleteAccount(session.profileId, "user_deleted", feedbackCategory)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
