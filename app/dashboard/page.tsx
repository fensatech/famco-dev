import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { isAdminEmail } from "@/lib/admin"
import { buildBillingSummary, billingEnforcementEnabled } from "@/lib/billing"
import { ensureRuntimeSchema, getDocuments, getEvents, getFamilyFacts, getFamilyInvites, getHouseholdMembers, getHouseholdRole, getInboxSyncState, getKids, getNotificationPreferences, getPets, getPrimaryHouseholdProfile, getProfile, getReminders, getScannedEventActions, getScannedEvents, getTasks } from "@/lib/db"
import type { HouseholdRole } from "@/types"
import { DashboardShell } from "./DashboardShell"
import packageJson from "../../package.json"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  await ensureRuntimeSchema().catch(() => {})
  const [profile, kids, allEvents, tasks, scannedEvents, facts, documents, pets, invites, householdMembers, insightActions, reminders, householdRole, notificationPreferences, inboxSyncState] = await Promise.all([
    getProfile(session.profileId),
    getKids(session.profileId),
    getEvents(session.profileId),
    getTasks(session.profileId),
    getScannedEvents(session.profileId),
    getFamilyFacts(session.profileId),
    getDocuments(session.profileId).catch(() => []),
    getPets(session.profileId).catch(() => []),
    getFamilyInvites(session.profileId).catch(() => []),
    getHouseholdMembers(session.profileId).catch(() => []),
    getScannedEventActions(session.profileId).catch(() => []),
    getReminders(session.profileId).catch(() => []),
    getHouseholdRole(session.profileId).catch(() => "member" as HouseholdRole),
    getNotificationPreferences(session.profileId).catch(() => ({
      id: "",
      profile_id: session.profileId,
      browser_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      default_event_offset_minutes: 0,
      default_task_offset_minutes: 0,
      default_school_offset_minutes: 1440,
      default_bill_offset_minutes: 1440,
      default_coparenting_offset_minutes: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    getInboxSyncState(session.profileId).catch(() => ({
      lastSyncAt: null,
      lastManualScanAt: null,
    })),
  ])
  if (!profile?.onboarding_completed) redirect("/onboarding")
  const primaryProfile = (await getPrimaryHouseholdProfile(session.profileId)) ?? profile
  const billing = buildBillingSummary({
    primaryProfile,
    currentProfileId: session.profileId,
    enforcementEnabled: billingEnforcementEnabled(),
  })
  return (
    <DashboardShell
      currentProfileId={session.profileId}
      currentUserFirstName={profile.first_name ?? ""}
      currentHouseholdRole={householdRole}
      notificationPreferences={notificationPreferences}
      profile={{
        firstName: primaryProfile.first_name ?? "",
        lastName: primaryProfile.last_name ?? "",
        email: primaryProfile.email ?? "",
        phone: primaryProfile.phone ?? "",
        city: primaryProfile.city ?? "",
        timezone: primaryProfile.timezone ?? "",
        familyType: primaryProfile.family_type ?? null,
        createdAt: primaryProfile.created_at,
        spouseFirstName: primaryProfile.spouse_first_name ?? "",
        spouseLastName: primaryProfile.spouse_last_name ?? "",
        spousePhone: primaryProfile.spouse_phone ?? "",
        spouseEmail: primaryProfile.spouse_email ?? "",
        addressStreet: primaryProfile.address_street ?? "",
        addressProvince: primaryProfile.address_province ?? "",
        addressPostal: primaryProfile.address_postal ?? "",
        addressCountry: primaryProfile.address_country ?? "",
        workType: primaryProfile.work_type ?? "",
        workAddress: primaryProfile.work_address ?? "",
        spouseWorkType: primaryProfile.spouse_work_type ?? "",
        spouseWorkAddress: primaryProfile.spouse_work_address ?? "",
      }}
      kids={kids.map((k) => ({
        id: k.id, name: k.name,
        firstName: k.first_name ?? null, lastName: k.last_name ?? null,
        dob: k.dob ? new Date(k.dob).toISOString().split("T")[0] : null,
        schoolName: k.school_name ?? null, schoolAddress: k.school_address ?? null, grade: k.grade ?? null,
        daycareName: k.daycare_name ?? null, daycareAddress: k.daycare_address ?? null,
      }))}
      pets={pets.map((p) => ({ id: p.id, name: p.name, animalType: p.animal_type, breed: p.breed ?? null, dob: p.dob ? new Date(p.dob).toISOString().split("T")[0] : null }))}
      provider={session.provider ?? ""}
      billing={billing}
      events={allEvents}
      tasks={tasks}
      scannedEvents={scannedEvents}
      facts={facts}
      documents={documents}
      invites={invites}
      householdMembers={householdMembers}
      insightActions={insightActions}
      reminders={reminders}
      lastInboxSyncAt={inboxSyncState.lastSyncAt ? inboxSyncState.lastSyncAt.toISOString() : null}
      lastManualInboxScanAt={inboxSyncState.lastManualScanAt ? inboxSyncState.lastManualScanAt.toISOString() : null}
      appVersion={packageJson.version}
      isAdmin={isAdminEmail(profile.email)}
    />
  )
}
