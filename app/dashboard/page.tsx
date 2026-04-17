import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile, getKids } from "@/lib/db"
import { DashboardShell } from "./DashboardShell"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const [profile, kids] = await Promise.all([
    getProfile(session.profileId),
    getKids(session.profileId),
  ])
  if (!profile?.onboarding_completed) redirect("/onboarding")
  return (
    <DashboardShell
      firstName={profile.first_name ?? ""}
      familyType={profile.family_type ?? null}
      kids={kids.map((k) => ({ name: k.name, dob: k.dob ?? null }))}
      provider={session.provider ?? ""}
    />
  )
}
