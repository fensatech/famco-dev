import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile, getKids } from "@/lib/db"
import { KidsForm } from "./KidsForm"

export default async function KidsPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  if ((profile?.onboarding_step ?? 0) < 3) redirect("/onboarding/family")
  const existingKids = await getKids(session.profileId)
  return (
    <KidsForm
      initialKids={existingKids.map((k) => ({
        name: k.name,
        dob: k.dob ? new Date(k.dob).toISOString().split("T")[0] : "",
      }))}
    />
  )
}
