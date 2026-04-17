import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { ProfileForm } from "./ProfileForm"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  return (
    <ProfileForm
      firstName={profile?.first_name ?? ""}
      lastName={profile?.last_name ?? ""}
    />
  )
}
