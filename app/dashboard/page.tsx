import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile, getKids, getEvents, getTasks, getScannedEvents } from "@/lib/db"
import { DashboardShell } from "./DashboardShell"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const today = new Date().toISOString().split("T")[0]
  const [profile, kids, todayEvents, tasks, scannedEvents] = await Promise.all([
    getProfile(session.profileId),
    getKids(session.profileId),
    getEvents(session.profileId, today),
    getTasks(session.profileId),
    getScannedEvents(session.profileId),
  ])
  if (!profile?.onboarding_completed) redirect("/onboarding")
  return (
    <DashboardShell
      profile={{
        firstName: profile.first_name ?? "",
        lastName: profile.last_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        city: profile.city ?? "",
        timezone: profile.timezone ?? "",
        familyType: profile.family_type ?? null,
        createdAt: profile.created_at,
      }}
      kids={kids.map((k) => ({ id: k.id, name: k.name, dob: k.dob ? new Date(k.dob).toISOString().split("T")[0] : null }))}
      provider={session.provider ?? ""}
      todayEvents={todayEvents}
      tasks={tasks}
      scannedEvents={scannedEvents}
    />
  )
}
