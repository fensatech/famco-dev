import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile, getKids, getEvents, getTasks, getScannedEvents, getFamilyFacts, getPets } from "@/lib/db"
import { DashboardShell } from "./DashboardShell"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const [profile, kids, allEvents, tasks, scannedEvents, facts, pets] = await Promise.all([
    getProfile(session.profileId),
    getKids(session.profileId),
    getEvents(session.profileId),
    getTasks(session.profileId),
    getScannedEvents(session.profileId),
    getFamilyFacts(session.profileId),
    getPets(session.profileId).catch(() => []),
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
        spouseFirstName: profile.spouse_first_name ?? "",
        spouseLastName: profile.spouse_last_name ?? "",
        spousePhone: profile.spouse_phone ?? "",
        spouseEmail: profile.spouse_email ?? "",
        addressStreet: profile.address_street ?? "",
        addressProvince: profile.address_province ?? "",
        addressPostal: profile.address_postal ?? "",
        addressCountry: profile.address_country ?? "",
        workType: profile.work_type ?? "",
        workAddress: profile.work_address ?? "",
        spouseWorkType: profile.spouse_work_type ?? "",
        spouseWorkAddress: profile.spouse_work_address ?? "",
      }}
      kids={kids.map((k) => ({
        id: k.id, name: k.name,
        firstName: k.first_name ?? null, lastName: k.last_name ?? null,
        dob: k.dob ? new Date(k.dob).toISOString().split("T")[0] : null,
        schoolName: k.school_name ?? null, grade: k.grade ?? null,
        daycareName: k.daycare_name ?? null, daycareAddress: k.daycare_address ?? null,
      }))}
      pets={pets.map((p) => ({ id: p.id, name: p.name, animalType: p.animal_type, breed: p.breed ?? null, dob: p.dob ? new Date(p.dob).toISOString().split("T")[0] : null }))}
      provider={session.provider ?? ""}
      allEvents={allEvents}
      tasks={tasks}
      scannedEvents={scannedEvents}
      facts={facts}
    />
  )
}
