"use client"
import { useState, useEffect } from "react"
import type { Event, Task } from "@/lib/db"
import type { FamilyFact, FamilyInvite, HouseholdMember, Reminder, ScannedEventAction } from "@/types"
import type { DashboardShellProps, Tab, DocumentRow, GCalEvent, KidRow, PetRow, ScannedEventRow } from "./types"
import { useSessionTimeout } from "./hooks/useSessionTimeout"
import { useInsightsRefresh } from "./hooks/useInsightsRefresh"
import { useDashboardMutations } from "./hooks/useDashboardMutations"
import { SidebarNav } from "./components/SidebarNav"
import { TopBar } from "./components/TopBar"
import { FabMenu } from "./components/FabMenu"
import { MobileNav } from "./components/MobileNav"
import { HomeTab } from "./tabs/HomeTab"
import { CalendarTab } from "./tabs/CalendarTab"
import { TasksTab } from "./tabs/TasksTab"
import { InsightsTab } from "./tabs/InsightsTab"
import { DataMapTab } from "./tabs/DataMapTab"
import { ExpensesTab } from "./tabs/ExpensesTab"
import { DocumentsTab } from "./tabs/DocumentsTab"
import { SettingsTab } from "./tabs/SettingsTab"
import { CoParentingTab } from "./tabs/CoParentingTab"
import { BillingTab } from "./tabs/BillingTab"
import type { CalendarMemberOption, CoParentingSchedule, CoParentingOverride } from "./types"
import { memberColor } from "./lib/events"

export function DashboardShell({ profile: initialProfile, billing, kids: initialKids, pets: initialPets, provider, events: initialEvents, tasks: initialTasks, scannedEvents: initialScannedEvents, facts: initialFacts, documents: initialDocuments, invites: initialInvites, householdMembers: initialHouseholdMembers, insightActions: initialInsightActions, reminders: initialReminders, appVersion }: DashboardShellProps) {
  const [tab, setTab] = useState<Tab>("home")
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [kids, setKids] = useState<KidRow[]>(initialKids)
  const [pets, setPets] = useState<PetRow[]>(initialPets)
  const [scannedEvents, setScannedEvents] = useState<ScannedEventRow[]>(initialScannedEvents)
  const [facts, setFacts] = useState<FamilyFact[]>(initialFacts)
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments)
  const [invites, setInvites] = useState<FamilyInvite[]>(initialInvites)
  const [householdMembers] = useState<HouseholdMember[]>(initialHouseholdMembers)
  const [insightActions, setInsightActions] = useState<ScannedEventAction[]>(initialInsightActions)
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalLoaded, setGcalLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [addEventSignal, setAddEventSignal] = useState(0)
  const [addTaskSignal, setAddTaskSignal] = useState(0)
  const [coparentingSchedule, setCoparentingSchedule] = useState<CoParentingSchedule | null>(null)
  const [coparentingOverrides, setCoparentingOverrides] = useState<CoParentingOverride[]>([])
  const [coparentingLoaded, setCoparentingLoaded] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    fetch("/api/coparenting")
      .then((r) => r.ok ? r.json() : { schedule: null, overrides: [] })
      .then(({ schedule, overrides }) => {
        setCoparentingSchedule(schedule ?? null)
        setCoparentingOverrides(overrides ?? [])
        setCoparentingLoaded(true)
      })
      .catch(() => setCoparentingLoaded(true))
  }, [])

  async function saveCoparentingSchedule(data: Omit<CoParentingSchedule, "id" | "profile_id" | "active" | "created_at">): Promise<boolean> {
    const r = await fetch("/api/coparenting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!r.ok) return false
    const { schedule: s, overrides: o } = await r.json()
    setCoparentingSchedule(s)
    setCoparentingOverrides(o ?? [])
    return true
  }

  async function addCoparentingOverride(scheduleId: string, data: { override_date: string; assigned_to: string; note: string | null }): Promise<boolean> {
    const r = await fetch("/api/coparenting/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule_id: scheduleId, ...data }) })
    if (!r.ok) return false
    const { override } = await r.json()
    setCoparentingOverrides((prev) => [...prev.filter((o) => o.override_date !== override.override_date), override].sort((a, b) => a.override_date.localeCompare(b.override_date)))
    return true
  }

  async function deleteCoparentingOverride(id: string): Promise<void> {
    await fetch(`/api/coparenting/overrides/${id}`, { method: "DELETE" })
    setCoparentingOverrides((prev) => prev.filter((o) => o.id !== id))
  }

  const { showWarning, dismiss } = useSessionTimeout()
  const { refreshInsights } = useInsightsRefresh({
    provider,
    onScannedEventsUpdate: setScannedEvents,
    onFactsUpdate: setFacts,
  })
  const { saving, addEvent, addTask, editTask, toggleTask, deleteTask, deleteEvent, updateEvent } = useDashboardMutations({ setEvents, setTasks, setReminders })

  const pending = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)
  const activeReminders = reminders.filter((r) => r.status === "pending")
  const showBillingBanner = billing.status !== "active" && (billing.status !== "trial" || billing.daysRemaining <= 14)
  const assigneeOptions = [
    ...householdMembers.map((member) => [member.first_name, member.last_name].filter(Boolean).join(" ")),
    ...kids.map((kid) => kid.name),
  ].map((name) => name.trim()).filter(Boolean).filter((name, index, list) => list.indexOf(name) === index)
  const profileAdultName = [initialProfile.firstName, initialProfile.lastName].filter(Boolean).join(" ").trim()
  const spouseName = [initialProfile.spouseFirstName, initialProfile.spouseLastName].filter(Boolean).join(" ").trim()
  const adultMemberNames = [
    profileAdultName,
    ...householdMembers.map((member) => [member.first_name, member.last_name].filter(Boolean).join(" ").trim()),
  ]
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
  const petMemberNames = pets.map((pet) => pet.name.trim()).filter(Boolean)
  const calendarMemberOptions: CalendarMemberOption[] = [
    ...adultMemberNames.map((name, index) => ({
      name,
      shortLabel: name.split(" ")[0] || name,
      color: index === 0 ? "#818cf8" : "#f472b6",
      kind: "adult" as const,
    })),
    ...(spouseName && !adultMemberNames.some((name) => name.toLowerCase() === spouseName.toLowerCase()) ? [{
      name: spouseName,
      shortLabel: spouseName.split(" ")[0] || spouseName,
      color: "#f472b6",
      kind: "adult" as const,
    }] : []),
    ...kids.map((kid, index) => ({
      name: kid.name,
      shortLabel: kid.firstName ?? kid.name.split(" ")[0] ?? kid.name,
      color: memberColor(index + 1),
      kind: "child" as const,
    })),
    ...petMemberNames.map((name) => ({
      name,
      shortLabel: name.split(" ")[0] || name,
      color: "#fbbf24",
      kind: "pet" as const,
    })),
  ].filter((member, index, list) => list.findIndex((item) => item.name.toLowerCase() === member.name.toLowerCase()) === index)
  const todayEvents = events.filter((e) => {
    const today = new Date().toISOString().split("T")[0]
    return e.event_date === today
  })

  async function createInvite(data: { invitee_email: string; invited_name?: string; relation: string; role: string }) {
    const res = await fetch("/api/family/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return false
    const { invite } = await res.json()
    setInvites((prev) => [invite, ...prev])
    const refreshMembers = await fetch("/api/family/invites")
    if (refreshMembers.ok) {
      setInvites((await refreshMembers.json()).invites ?? [])
    }
    return true
  }

  async function revokeInvite(id: string) {
    const res = await fetch(`/api/family/invites/${id}`, { method: "DELETE" })
    if (!res.ok) return false
    setInvites((prev) => prev.map((invite) => invite.id === id ? { ...invite, status: "revoked" } : invite))
    return true
  }

  async function updateInsightAction(
    scannedEventId: string,
    data: { status?: "new" | "handled"; assigned_to?: string | null; last_action?: "calendar" | "task" | "reminder" | "handled" | null },
  ) {
    const res = await fetch("/api/insights/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanned_event_id: scannedEventId, ...data }),
    })
    if (!res.ok) return false
    const { action } = await res.json()
    setInsightActions((prev) => {
      const filtered = prev.filter((item) => item.scanned_event_id !== scannedEventId)
      return [action, ...filtered]
    })
    return true
  }

  async function addReminder(data: { source_type: Reminder["source_type"]; source_id?: string | null; title: string; note?: string | null; remind_at: string }) {
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return false
    const { reminder } = await res.json()
    setReminders((prev) => [...prev.filter((r) => r.id !== reminder.id && !(r.source_type === reminder.source_type && r.source_id === reminder.source_id)), reminder].sort((a, b) => a.remind_at.localeCompare(b.remind_at)))
    return true
  }

  async function dismissReminderAction(id: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    })
    if (!res.ok) return false
    setReminders((prev) => prev.filter((r) => r.id !== id))
    return true
  }

  async function snoozeReminderAction(id: string, remindAt: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snooze", remind_at: remindAt }),
    })
    if (!res.ok) return false
    const { reminder } = await res.json()
    setReminders((prev) => prev.map((r) => r.id === id ? reminder : r).sort((a, b) => a.remind_at.localeCompare(b.remind_at)))
    return true
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

      {/* Inactivity warning */}
      {showWarning && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(251,191,36,0.12)", borderBottom: "1px solid rgba(251,191,36,0.4)", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: "0.85rem", color: "#fbbf24" }}>⏱ You&apos;ve been inactive for 25 minutes — you&apos;ll be signed out in 5 minutes.</span>
          <button onClick={dismiss} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>
      )}

      {/* Sidebar (desktop) */}
      {!isMobile && (
        <SidebarNav tab={tab} onTab={setTab} scannedCount={scannedEvents.length} pendingTaskCount={pending.length} appVersion={appVersion} />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar tab={tab} isMobile={isMobile} appVersion={appVersion} />

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", paddingBottom: isMobile ? "5.5rem" : "5rem", overflowY: "auto" }}>
          {showBillingBanner && tab !== "billing" && (
            <div style={{ marginBottom: "1rem", borderRadius: "16px", padding: "1rem 1.1rem", border: "1px solid rgba(20,184,166,0.22)", background: billing.status === "grace" ? "rgba(251,191,36,0.12)" : "rgba(20,184,166,0.09)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: billing.status === "grace" ? "#f59e0b" : "#14b8a6", marginBottom: "0.18rem" }}>
                    {billing.status === "trial"
                      ? `${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left in your free trial`
                      : billing.status === "grace"
                        ? `Grace week preview: ${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left`
                        : "Subscription access preview"}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
                    {billing.enforcementEnabled
                      ? "When the trial ends, syncing stops first. After the 7-day grace period, logins stop and household data becomes eligible for permanent deletion."
                      : "Preview only while you test Famco: PayPal billing is not enforced yet, but this is the timeline your household will follow when subscriptions go live."}
                  </div>
                </div>
                <button
                  onClick={() => setTab("billing")}
                  style={{ border: "none", borderRadius: "999px", background: "linear-gradient(135deg,#14b8a6,#0ea5e9)", color: "#fff", padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", fontFamily: "inherit" }}
                >
                  Open Billing
                </button>
              </div>
            </div>
          )}

          {tab === "home" && (
            <HomeTab
              firstName={initialProfile.firstName}
              kids={kids}
              events={todayEvents}
              pendingTasks={pending}
              memberOptions={calendarMemberOptions}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onDeleteEvent={deleteEvent}
              saving={saving}
              totalTasks={tasks.length}
              onNavigate={setTab}
              coparentingSchedule={coparentingSchedule}
              coparentingOverrides={coparentingOverrides}
              reminders={activeReminders}
              assigneeOptions={assigneeOptions}
              onDismissReminder={dismissReminderAction}
              onSnoozeReminder={snoozeReminderAction}
            />
          )}

          {tab === "calendar" && (
            <CalendarTab
              events={events}
              tasks={tasks}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
              onAddEvent={addEvent}
              saving={saving}
              provider={provider}
              memberOptions={calendarMemberOptions}
              scannedEvents={scannedEvents}
              gcalEvents={gcalEvents}
              setGcalEvents={setGcalEvents}
              gcalLoaded={gcalLoaded}
              setGcalLoaded={setGcalLoaded}
              onEventsRefresh={setEvents}
              onOpenBilling={() => setTab("billing")}
              openSignal={addEventSignal}
              coparentingSchedule={coparentingSchedule}
              coparentingOverrides={coparentingOverrides}
            />
          )}

          {tab === "tasks" && (
            <TasksTab
              pending={pending}
              done={done}
              assigneeOptions={assigneeOptions}
              onAddTask={addTask}
              onEditTask={editTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              saving={saving}
              openSignal={addTaskSignal}
            />
          )}

          {tab === "insights" && (
            <InsightsTab
              scannedEvents={scannedEvents}
              insightActions={insightActions}
              assigneeOptions={assigneeOptions}
              provider={provider}
              onOpenBilling={() => setTab("billing")}
              onRefresh={refreshInsights}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onAddReminder={addReminder}
              onUpdateAction={updateInsightAction}
            />
          )}

          {tab === "data" && (
            <DataMapTab
              profile={initialProfile}
              kids={kids}
              facts={facts}
              scannedEvents={scannedEvents}
              onDeleteFact={async (id) => {
                const response = await fetch("/api/facts", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                })
                if (!response.ok) return false
                setFacts((prev) => prev.filter((f) => f.id !== id))
                return true
              }}
              onUpdateFact={async (id, object) => {
                const response = await fetch("/api/facts", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, object }),
                })
                if (!response.ok) return false
                setFacts((prev) => prev.map((f) => f.id === id ? { ...f, object, status: "confirmed" as const } : f))
                return true
              }}
            />
          )}

          {tab === "expenses" && (
            <ExpensesTab scannedEvents={scannedEvents} />
          )}

          {tab === "documents" && (
            <DocumentsTab
              documents={documents}
              memberOptions={calendarMemberOptions}
              onDocumentsChange={setDocuments}
            />
          )}

          {tab === "coparenting" && (
            <CoParentingTab
              kids={kids}
              schedule={coparentingSchedule}
              overrides={coparentingOverrides}
              loaded={coparentingLoaded}
              onSaveSchedule={saveCoparentingSchedule}
              onAddOverride={addCoparentingOverride}
              onDeleteOverride={deleteCoparentingOverride}
            />
          )}

          {tab === "settings" && (
            <SettingsTab
              profile={initialProfile}
              kids={kids}
              setKids={setKids}
              pets={pets}
              setPets={setPets}
              invites={invites}
              householdMembers={householdMembers}
              onInvite={createInvite}
              onRevokeInvite={revokeInvite}
            />
          )}

          {tab === "billing" && (
            <BillingTab billing={billing} />
          )}

        </main>
      </div>

      {/* FAB (desktop, home + insights) */}
      {!isMobile && (tab === "home" || tab === "insights") && (
        <FabMenu
          onAddEvent={() => { setTab("calendar"); setAddEventSignal((n) => n + 1) }}
          onAddTask={() => { setTab("tasks"); setAddTaskSignal((n) => n + 1) }}
        />
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileNav tab={tab} onTab={setTab} scannedCount={scannedEvents.length} pendingTaskCount={pending.length} />
      )}

    </div>
  )
}
