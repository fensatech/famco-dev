"use client"
import { useState, useEffect } from "react"
import type { Event, Task } from "@/lib/db"
import type { FamilyFact, FamilyInvite, Reminder } from "@/types"
import type { DashboardShellProps, Tab, GCalEvent, KidRow, PetRow, ScannedEventRow } from "./types"
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
import { SettingsTab } from "./tabs/SettingsTab"
import { CoParentingTab } from "./tabs/CoParentingTab"
import type { CoParentingSchedule, CoParentingOverride } from "./types"

export function DashboardShell({ profile: initialProfile, kids: initialKids, pets: initialPets, provider, events: initialEvents, tasks: initialTasks, scannedEvents: initialScannedEvents, facts: initialFacts, invites: initialInvites, reminders: initialReminders }: DashboardShellProps) {
  const [tab, setTab] = useState<Tab>("home")
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [kids, setKids] = useState<KidRow[]>(initialKids)
  const [pets, setPets] = useState<PetRow[]>(initialPets)
  const [scannedEvents, setScannedEvents] = useState<ScannedEventRow[]>(initialScannedEvents)
  const [facts, setFacts] = useState<FamilyFact[]>(initialFacts)
  const [invites, setInvites] = useState<FamilyInvite[]>(initialInvites)
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
  const assigneeOptions = [
    [initialProfile.firstName, initialProfile.lastName].filter(Boolean).join(" "),
    [initialProfile.spouseFirstName, initialProfile.spouseLastName].filter(Boolean).join(" "),
    ...kids.map((kid) => kid.name),
    ...invites.filter((invite) => invite.status === "accepted" && invite.invited_name).map((invite) => invite.invited_name as string),
  ].map((name) => name.trim()).filter(Boolean).filter((name, index, list) => list.indexOf(name) === index)
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
    return true
  }

  async function revokeInvite(id: string) {
    const res = await fetch(`/api/family/invites/${id}`, { method: "DELETE" })
    if (!res.ok) return false
    setInvites((prev) => prev.map((invite) => invite.id === id ? { ...invite, status: "revoked" } : invite))
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
        <SidebarNav tab={tab} onTab={setTab} scannedCount={scannedEvents.length} pendingTaskCount={pending.length} />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar tab={tab} />

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", paddingBottom: isMobile ? "5.5rem" : "5rem", overflowY: "auto" }}>

          {tab === "home" && (
            <HomeTab
              firstName={initialProfile.firstName}
              kids={kids}
              events={todayEvents}
              pendingTasks={pending}
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
              kids={kids}
              scannedEvents={scannedEvents}
              gcalEvents={gcalEvents}
              setGcalEvents={setGcalEvents}
              gcalLoaded={gcalLoaded}
              setGcalLoaded={setGcalLoaded}
              onEventsRefresh={setEvents}
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
              provider={provider}
              onRefresh={refreshInsights}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onAddReminder={addReminder}
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
              onInvite={createInvite}
              onRevokeInvite={revokeInvite}
            />
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
