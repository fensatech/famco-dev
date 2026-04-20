import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { FamilyForm } from "./FamilyForm"

export default async function FamilyPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  if ((profile?.onboarding_step ?? 0) < 2) redirect("/onboarding/location")
  return (
    <FamilyForm
      familyType={profile?.family_type ?? null}
      coParentEmail={profile?.co_parent_email ?? ""}
      partnerName={profile?.partner_name ?? ""}
    />
  )
}
