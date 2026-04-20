import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { LocationForm } from "./LocationForm"

export default async function LocationPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  if ((profile?.onboarding_step ?? 0) < 1) redirect("/onboarding/profile")
  return (
    <LocationForm
      city={profile?.city ?? ""}
      timezone={profile?.timezone ?? ""}
      phone={profile?.phone ?? ""}
    />
  )
}
