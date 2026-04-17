import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { ONBOARDING_STEPS } from "@/types"

export default async function OnboardingIndexPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  const step = ONBOARDING_STEPS[profile?.onboarding_step ?? 0] ?? "profile"
  redirect(`/onboarding/${step}`)
}
