"use client"
import { useState, useEffect, useRef } from "react"
import { signOut } from "next-auth/react"
import { FAMILY_TYPE_OPTIONS, type FamilyType, type FamilyFact } from "@/types"
import { FACT_GROUPS, PREDICATE_META } from "@/lib/facts"
import type { Event, Task } from "@/lib/db"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileData {
  firstName: string; lastName: string; email: string
  phone: string; city: string; timezone: string; familyType: FamilyType | null
  createdAt: string
  // Spouse
  spouseFirstName: string; spouseLastName: string; spousePhone: string; spouseEmail: string
  // Full address
  addressStreet: string; addressProvince: string; addressPostal: string; addressCountry: string
  // Work
  workType: string; workAddress: string; spouseWorkType: string; spouseWorkAddress: string
}
interface KidRow { id: string; name: string; firstName: string | null; lastName: string | null; dob: string | null; schoolName: string | null; grade: string | null; daycareName: string | null; daycareAddress: string | null }
interface PetRow { id: string; name: string; animalType: string; breed: string | null; dob: string | null }
interface ScannedEventRow {
  id: string; title: string; event_date: string | null
  start_time: string | null; end_time: string | null
  event_type: string; organization_name: string | null
  organization_type: string | null; source_from: string; snippet: string
  kid_name: string | null; grade: string | null; school_name: string | null
  special_instructions: string | null; urgency: string
  auto_add_to_calendar: boolean; calendar_title: string | null; ai_processed: boolean
  vendor: string | null; amount: number | null; recurrence: string | null
}
interface ExpenseRow { id: string; title: string; amount: number; category: string | null; expense_date: string; notes: string | null }
interface Props {
  profile: ProfileData; kids: KidRow[]; pets: PetRow[]; provider: string
  allEvents: Event[]; tasks: Task[]; scannedEvents: ScannedEventRow[]
  facts: FamilyFact[]
}
type Tab = "home" | "calendar" | "tasks" | "insights" | "data" | "expenses" | "settings"
type CalView = "day" | "week" | "month"

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV: { id: Tab; label: string; color: string; bg: string; gradient: string }[] = [
  { id: "home",     label: "Home",          color: "#6366F1", bg: "rgba(99,102,241,0.1)",  gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { id: "calendar", label: "Calendar",      color: "#0EA5E9", bg: "rgba(14,165,233,0.1)",  gradient: "linear-gradient(135deg,#0EA5E9,#6366F1)" },
  { id: "tasks",    label: "Tasks",         color: "#EC4899", bg: "rgba(236,72,153,0.1)",  gradient: "linear-gradient(135deg,#EC4899,#F43F5E)" },
  { id: "insights", label: "Insights",      color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  gradient: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  { id: "data",     label: "Data Map",      color: "#10B981", bg: "rgba(16,185,129,0.1)",  gradient: "linear-gradient(135deg,#10B981,#0EA5E9)" },
  { id: "expenses", label: "Expenses",      color: "#F97316", bg: "rgba(249,115,22,0.1)",  gradient: "linear-gradient(135deg,#F97316,#EAB308)" },
  { id: "settings", label: "Manage Family", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
]

// ── SVG nav icons ─────────────────────────────────────────────────────────────
function NavIcon({ id, size = 18, color = "currentColor" }: { id: string; size?: number; color?: string }) {
  const s = { width: size, height: size, display: "block", flexShrink: 0 } as React.CSSProperties
  const a = { fill: "none", stroke: color, strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (id === "home")     return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  if (id === "calendar") return <svg style={s} viewBox="0 0 24 24" {...a}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (id === "tasks")    return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
  if (id === "insights") return <svg style={s} viewBox="0 0 24 24" {...a}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  if (id === "data")     return <svg style={s} viewBox="0 0 24 24" {...a}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
  if (id === "expenses") return <svg style={s} viewBox="0 0 24 24" {...a}><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="17"/><path d="M15 9a3 3 0 00-6 0c0 2 6 2 6 4a3 3 0 01-6 0"/></svg>
  if (id === "settings") return <svg style={s} viewBox="0 0 24 24" {...a}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
  return <svg style={s} viewBox="0 0 24 24" {...a}><circle cx="12" cy="12" r="10"/></svg>
}

// ── Timezones ─────────────────────────────────────────────────────────────────
const TIMEZONES = [
  { value: "America/New_York",                label: "Eastern — New York, Boston" },
  { value: "America/Indiana/Indianapolis",    label: "Eastern — Indiana (no DST)" },
  { value: "America/Detroit",                 label: "Eastern — Detroit" },
  { value: "America/Chicago",                 label: "Central — Chicago, Houston" },
  { value: "America/Indiana/Knox",            label: "Central — Indiana (Knox)" },
  { value: "America/Menominee",               label: "Central — Menominee" },
  { value: "America/Denver",                  label: "Mountain — Denver, SLC" },
  { value: "America/Phoenix",                 label: "Mountain — Arizona (no DST)" },
  { value: "America/Boise",                   label: "Mountain — Boise" },
  { value: "America/Los_Angeles",             label: "Pacific — LA, Seattle" },
  { value: "America/Anchorage",               label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu",                label: "Hawaii" },
  { value: "America/Toronto",                 label: "Eastern — Toronto" },
  { value: "America/Winnipeg",                label: "Central — Winnipeg" },
  { value: "America/Regina",                  label: "Central — Saskatchewan" },
  { value: "America/Edmonton",                label: "Mountain — Edmonton" },
  { value: "America/Vancouver",               label: "Pacific — Vancouver" },
  { value: "America/Halifax",                 label: "Atlantic — Halifax" },
  { value: "America/St_Johns",               label: "Newfoundland — St. John's" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0] }
function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}
function fmtTime(t: string | null) {
  if (!t) return ""
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`
}
function greetText(name: string) {
  const h = new Date().getHours()
  const t = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"
  return `Good ${t}, ${name || "there"} 👋`
}

const EVENT_TYPE_ICON: Record<string, string> = {
  calendar_invite: "📆", appointment: "📋", school_event: "🏫", medical: "🩺",
  field_trip: "🚌", no_school: "🚫", special_day: "🎉", other: "📧",
  activity: "⚽", recital: "🎭", subscription: "💳", invoice: "🧾", bill: "📄",
}
const EVENT_TYPE_LABEL: Record<string, string> = {
  calendar_invite: "Calendar", appointment: "Appointment", school_event: "School",
  medical: "Medical", field_trip: "Field Trip", no_school: "No School",
  special_day: "Special Day", activity: "Activity", recital: "Performance",
  subscription: "Subscription", invoice: "Invoice", bill: "Bill", other: "Other",
}
const URGENCY_COLOR: Record<string, string> = {
  high: "#f87171", normal: "#60a5fa", low: "#6b7280",
}
const ORG_TYPE_COLOR: Record<string, string> = {
  school: "#34d399", medical_clinic: "#60a5fa", dental: "#a78bfa",
  sports: "#f472b6", pharmacy: "#fbbf24",
}
// Family member colors: index 0 = parent, 1+ = kids (consistent across all pages)
const MEMBER_COLORS = ["#818cf8", "#f472b6", "#34d399", "#fb923c", "#60a5fa", "#a78bfa", "#fbbf24"]
function memberColor(index: number) { return MEMBER_COLORS[index % MEMBER_COLORS.length] }

// ── Root component ────────────────────────────────────────────────────────────
export function DashboardShell({ profile: initialProfile, kids: initialKids, pets: initialPets, provider, allEvents: initialEvents, tasks: initialTasks, scannedEvents: initialScannedEvents, facts: initialFacts }: Props) {
  const [tab, setTab] = useState<Tab>("home")
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [kids, setKids] = useState<KidRow[]>(initialKids)
  const [pets, setPets] = useState<PetRow[]>(initialPets)
  const [scannedEvents, setScannedEvents] = useState<ScannedEventRow[]>(initialScannedEvents)
  const [facts, setFacts] = useState<FamilyFact[]>(initialFacts)
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalLoaded, setGcalLoaded] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventDate, setNewEventDate] = useState(todayStr())
  const [newEventTime, setNewEventTime] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // 30-minute inactivity timeout
  useEffect(() => {
    const TIMEOUT_MS = 30 * 60 * 1000
    const WARN_MS = 25 * 60 * 1000
    let warnTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    function reset() {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      setShowTimeoutWarning(false)
      warnTimer = setTimeout(() => setShowTimeoutWarning(true), WARN_MS)
      logoutTimer = setTimeout(() => signOut({ callbackUrl: "/" }), TIMEOUT_MS)
    }

    const evts = ["mousemove", "keydown", "click", "touchstart", "scroll"]
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      evts.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  useEffect(() => {
    if (provider !== "google") return
    const key = "famco_scan_done"
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    fetch("/api/emails/scan", { method: "POST" }).catch(() => {})
  }, [provider])

  async function refreshInsights(): Promise<{ error?: string }> {
    sessionStorage.removeItem("famco_scan_done")
    try {
      const res = await fetch("/api/emails/scan", { method: "POST" })
      if (res.status === 401) return { error: "token_expired" }
      if (!res.ok) return { error: "scan_failed" }
      const [insightsRes, factsRes] = await Promise.all([
        fetch("/api/insights"),
        fetch("/api/facts"),
      ])
      if (insightsRes.ok) {
        const { events } = await insightsRes.json()
        setScannedEvents(events)
      }
      if (factsRes.ok) {
        const { facts: newFacts } = await factsRes.json()
        setFacts(newFacts)
      }
      return {}
    } catch {
      return { error: "network_error" }
    }
  }

  async function addEvent() {
    if (!newEventTitle.trim()) return
    setSaving(true)
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newEventTitle.trim(), event_date: newEventDate || todayStr(), start_time: newEventTime || null }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setEvents((prev) => [...prev, event].sort((a, b) => {
        if (a.event_date !== b.event_date) return (a.event_date ?? "") < (b.event_date ?? "") ? -1 : 1
        return (a.start_time ?? "99:99") < (b.start_time ?? "99:99") ? -1 : 1
      }))
      setNewEventTitle(""); setNewEventTime(""); setNewEventDate(todayStr()); setShowAddEvent(false)
    }
    setSaving(false)
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return
    setSaving(true)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle.trim() }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => [task, ...prev])
      setNewTaskTitle(""); setShowAddTask(false)
    }
    setSaving(false)
  }

  async function toggleTask(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => prev.map((t) => t.id === id ? task : t).sort((a, b) => Number(a.completed) - Number(b.completed)))
    }
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" })
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const activeNav = NAV.find((n) => n.id === tab)!
  const todayEvents = events.filter((e) => e.event_date === todayStr())
  const pending = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

      {/* ── Inactivity warning banner ─────────────────────────────────────────── */}
      {showTimeoutWarning && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(251,191,36,0.12)", borderBottom: "1px solid rgba(251,191,36,0.4)", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: "0.85rem", color: "#fbbf24" }}>⏱ You've been inactive for 25 minutes — you'll be signed out in 5 minutes.</span>
          <button onClick={() => setShowTimeoutWarning(false)} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>
      )}

      {/* ── Left Sidebar (desktop only) ───────────────────────────────────────── */}
      <aside style={{
        width: "260px", flexShrink: 0, display: isMobile ? "none" : "flex", flexDirection: "column",
        borderRight: "1px solid var(--border)", padding: "1.5rem 1rem",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        background: "#FFFFFF", boxShadow: "1px 0 0 rgba(60,60,67,0.1)",
      }}>
        {/* Logo */}
        <button onClick={() => setTab("home")} style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2rem", padding: "0 0.5rem", background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#6366F1,#8B5CF6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontFamily: "inherit", fontWeight: 700, fontSize: "1.15rem", color: "var(--text)", letterSpacing: "-0.02em" }}>Famco</span>
        </button>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
          {NAV.map(({ id, label, color, bg }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.7rem 0.875rem", borderRadius: "12px", border: "none",
                background: active ? bg : "transparent",
                color: active ? color : "var(--muted)",
                fontSize: "0.875rem", fontWeight: active ? 600 : 400,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s", textAlign: "left", width: "100%",
                boxShadow: active ? `0 1px 4px ${color}25` : "none",
              }}>
                <NavIcon id={id} size={17} color={active ? color : "var(--muted)"} />
                <span>{label}</span>
                {id === "insights" && scannedEvents.length > 0 && (
                  <span style={{ marginLeft: "auto", background: "#fbbf24", color: "#000", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem" }}>{scannedEvents.length > 99 ? "99+" : scannedEvents.length}</span>
                )}
                {id === "tasks" && pending.length > 0 && (
                  <span style={{ marginLeft: "auto", background: "#f472b6", color: "#fff", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem" }}>{pending.length}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Sign out at bottom */}
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.65rem 0.875rem", borderRadius: "10px", border: "1px solid rgba(60,60,67,0.12)", background: "transparent", color: "var(--muted)", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginTop: "1rem", width: "100%", transition: "background 0.15s" }}>
          <span>↪</span> Sign out
        </button>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ padding: "0.875rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <NavIcon id={activeNav.id} size={18} color={activeNav.color} />
            <h1 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>{activeNav.label}</h1>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{todayLabel()}</span>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", paddingBottom: isMobile ? "5.5rem" : "5rem", overflowY: "auto" }}>

          {tab === "home" && (
            <HomeTab
              firstName={initialProfile.firstName}
              events={todayEvents} pendingTasks={pending}
              showAddEvent={showAddEvent} setShowAddEvent={setShowAddEvent}
              newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle}
              newEventDate={newEventDate} setNewEventDate={setNewEventDate}
              newEventTime={newEventTime} setNewEventTime={setNewEventTime}
              onAddEvent={addEvent}
              showAddTask={showAddTask} setShowAddTask={setShowAddTask}
              newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle}
              onAddTask={addTask}
              onToggleTask={toggleTask} onDeleteTask={deleteTask} onDeleteEvent={deleteEvent}
              saving={saving} totalTasks={tasks.length}
              onNavigate={(t) => setTab(t)}
            />
          )}
          {tab === "calendar" && (
            <CalendarTab events={events} onDeleteEvent={deleteEvent}
              onUpdateEvent={async (id, data) => {
                const res = await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
                if (res.ok) { const { event } = await res.json(); setEvents((prev) => prev.map((e) => e.id === id ? event : e)) }
              }}
              showAddEvent={showAddEvent} setShowAddEvent={setShowAddEvent}
              newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle}
              newEventDate={newEventDate} setNewEventDate={setNewEventDate}
              newEventTime={newEventTime} setNewEventTime={setNewEventTime}
              onAddEvent={addEvent} saving={saving} provider={provider}
              kids={kids} scannedEvents={scannedEvents}
              gcalEvents={gcalEvents} setGcalEvents={setGcalEvents}
              gcalLoaded={gcalLoaded} setGcalLoaded={setGcalLoaded}
              onEventsRefresh={setEvents}
            />
          )}
          {tab === "tasks" && (
            <TasksTab pending={pending} done={done}
              showAddTask={showAddTask} setShowAddTask={setShowAddTask}
              newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle}
              onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} saving={saving}
            />
          )}
          {tab === "insights" && (
            <InsightsTab scannedEvents={scannedEvents} signedUpAt={initialProfile.createdAt} provider={provider} onRefresh={refreshInsights} kids={kids} />
          )}
          {tab === "data" && (
            <DataMapTab
              profile={initialProfile}
              kids={kids}
              facts={facts}
              scannedEvents={scannedEvents}
              onDeleteFact={async (id) => {
                await fetch("/api/facts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
                setFacts((prev) => prev.filter((f) => f.id !== id))
              }}
              onUpdateFact={async (id, object) => {
                await fetch("/api/facts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, object }) })
                setFacts((prev) => prev.map((f) => f.id === id ? { ...f, object, status: "confirmed" as const } : f))
              }}
            />
          )}
          {tab === "expenses" && (
            <ExpensesTab scannedEvents={scannedEvents} />
          )}
          {tab === "settings" && (
            <SettingsTab profile={initialProfile} kids={kids} setKids={setKids} pets={pets} setPets={setPets} />
          )}
        </main>
      </div>

      {/* FAB (only shown on home and insights tabs) */}
      {!isMobile && (tab === "home" || tab === "insights") && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 50 }}>
          {fabOpen && (
            <div style={{ position: "absolute", bottom: "4rem", right: 0, display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
              <FabOption label="Add Event" onClick={() => { setTab("calendar"); setShowAddEvent(true); setFabOpen(false) }} />
              <FabOption label="Add Task" onClick={() => { setTab("tasks"); setShowAddTask(true); setFabOpen(false) }} />
            </div>
          )}
          <button onClick={() => setFabOpen((v) => !v)} style={fabStyle(fabOpen)}>
            {fabOpen ? "×" : "+"}
          </button>
        </div>
      )}

      {/* ── Mobile bottom nav ─────────────────────────────────────────────────── */}
      {isMobile && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "64px", background: "rgba(255,255,255,0.95)", borderTop: "1px solid rgba(60,60,67,0.1)", display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 100, backdropFilter: "blur(20px)", boxShadow: "0 -1px 20px rgba(0,0,0,0.06)" }}>
          {NAV.map(({ id, label, color, bg }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", background: active ? bg : "transparent", border: "none", cursor: "pointer", padding: "0.35rem 0.625rem 0.3rem", borderRadius: "12px", color: active ? color : "var(--muted)", fontSize: "0.58rem", fontWeight: active ? 700 : 400, fontFamily: "inherit", position: "relative", minWidth: "52px" }}>
                <NavIcon id={id} size={22} color={active ? color : "var(--muted)"} />
                <span>{label}</span>
                {id === "insights" && scannedEvents.length > 0 && (
                  <span style={{ position: "absolute", top: "2px", right: "4px", background: "#fbbf24", color: "#000", borderRadius: "10px", fontSize: "0.5rem", fontWeight: 700, padding: "0.05rem 0.3rem" }}>{scannedEvents.length > 99 ? "99+" : scannedEvents.length}</span>
                )}
                {id === "tasks" && pending.length > 0 && (
                  <span style={{ position: "absolute", top: "2px", right: "4px", background: "#f472b6", color: "#fff", borderRadius: "10px", fontSize: "0.5rem", fontWeight: 700, padding: "0.05rem 0.3rem" }}>{pending.length}</span>
                )}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

// ── Shared Add Event Modal ─────────────────────────────────────────────────────
function AddEventModal({ title, setTitle, date, setDate, time, setTime, onSave, onCancel, saving }: {
  title: string; setTitle: (v: string) => void
  date: string; setDate: (v: string) => void
  time: string; setTime: (v: string) => void
  onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>📅 Add Event</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label style={fieldLabelStyle}>Event Title *</label>
            <input autoFocus placeholder="e.g. Soccer practice, Doctor visit…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && onSave()} style={{ ...inputSt, marginTop: "0.3rem", fontSize: "0.95rem" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={fieldLabelStyle}>Date *</label>
              <input type="date" value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Time (optional)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !title.trim() || !date} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() || !date ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() || !date ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ title, setTitle, onSave, onCancel, saving }: {
  title: string; setTitle: (v: string) => void
  onSave: () => void; onCancel: () => void; saving: boolean
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(244,114,182,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>✅ Add Task</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>
        <div>
          <label style={fieldLabelStyle}>Task Title *</label>
          <input autoFocus placeholder="e.g. Buy school supplies, Call dentist…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && onSave()} style={{ ...inputSt, marginTop: "0.3rem", fontSize: "0.95rem" }} />
        </div>
        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !title.trim()} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() ? "rgba(244,114,182,0.3)" : "linear-gradient(135deg,#f472b6,#ec4899)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Home Tab ──────────────────────────────────────────────────────────────────
function HomeTab({ firstName, events, pendingTasks, showAddEvent, setShowAddEvent, newEventTitle, setNewEventTitle, newEventDate, setNewEventDate, newEventTime, setNewEventTime, onAddEvent, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, onAddTask, onToggleTask, onDeleteTask, onDeleteEvent, saving, totalTasks, onNavigate }: {
  firstName: string; events: Event[]; pendingTasks: Task[];
  showAddEvent: boolean; setShowAddEvent: (v: boolean) => void;
  newEventTitle: string; setNewEventTitle: (v: string) => void;
  newEventDate: string; setNewEventDate: (v: string) => void;
  newEventTime: string; setNewEventTime: (v: string) => void;
  onAddEvent: () => void; showAddTask: boolean; setShowAddTask: (v: boolean) => void;
  newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  onAddTask: () => void; onToggleTask: (id: string, c: boolean) => void;
  onDeleteTask: (id: string) => void; onDeleteEvent: (id: string) => void;
  saving: boolean; totalTasks: number; onNavigate: (tab: Tab) => void;
}) {
  const [todayExpenses, setTodayExpenses] = useState<ExpenseRow[]>([])
  const today = todayStr()

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.ok ? r.json() : { expenses: [] })
      .then(({ expenses }) => {
        if (Array.isArray(expenses)) {
          setTodayExpenses((expenses as ExpenseRow[]).filter((e) => e.expense_date === today))
        }
      })
      .catch(() => {})
  }, [today])

  const todayExpenseTotal = todayExpenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <>
      {showAddEvent && <AddEventModal title={newEventTitle} setTitle={setNewEventTitle} date={newEventDate} setDate={setNewEventDate} time={newEventTime} setTime={setNewEventTime} onSave={onAddEvent} onCancel={() => setShowAddEvent(false)} saving={saving} />}
      {showAddTask && <AddTaskModal title={newTaskTitle} setTitle={setNewTaskTitle} onSave={onAddTask} onCancel={() => setShowAddTask(false)} saving={saving} />}

      {/* Greeting */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName || "there"}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", fontWeight: 400 }}>{todayLabel()}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {([
          { label: "Events Today", value: events.length, gradient: "linear-gradient(135deg,#0EA5E9,#6366F1)", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          )},
          { label: "Pending Tasks", value: pendingTasks.length, gradient: "linear-gradient(135deg,#EC4899,#F43F5E)", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          )},
          { label: "Today's Spend", value: todayExpenseTotal > 0 ? `$${todayExpenseTotal.toFixed(0)}` : "$0", gradient: "linear-gradient(135deg,#F97316,#EAB308)", icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="17"/><path d="M15 9a3 3 0 00-6 0c0 2 6 2 6 4a3 3 0 01-6 0"/></svg>
          )},
        ] as { label: string; value: string | number; gradient: string; icon: React.ReactNode }[]).map(({ label, value, gradient, icon }) => (
          <div key={label} style={{ background: "#FFFFFF", borderRadius: "20px", padding: "1.375rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--text)" }}>{value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem", fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's schedule + tasks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        <section style={sectionCard}>
          <SectionHeader title="Today's Schedule" accent="#0EA5E9" onAdd={() => setShowAddEvent(true)} />
          {events.length === 0 ? <Empty text="No events today" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {events.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} />)}
            </div>
          )}
        </section>

        <section style={sectionCard}>
          <SectionHeader title="Tasks & Chores" accent="#EC4899" onAdd={() => setShowAddTask(true)} />
          {pendingTasks.length === 0 ? <Empty text="No pending tasks" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pendingTasks.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} />)}
              {pendingTasks.length > 6 && <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>+{pendingTasks.length - 6} more in Tasks</p>}
            </div>
          )}
        </section>
      </div>

      {/* Quick-access tiles */}
      <div style={{ marginBottom: "0.875rem" }}>
        <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick Access</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {([
          { id: "calendar" as Tab, label: "Calendar", desc: "Events & schedules", gradient: "linear-gradient(145deg,#667eea,#764ba2)" },
          { id: "tasks" as Tab,    label: "Tasks",    desc: "Chores & to-dos",   gradient: "linear-gradient(145deg,#f093fb,#f5576c)" },
          { id: "insights" as Tab, label: "Insights", desc: "Email intelligence", gradient: "linear-gradient(145deg,#4facfe,#00f2fe)" },
          { id: "data" as Tab,     label: "Data Map", desc: "Family knowledge",  gradient: "linear-gradient(145deg,#43e97b,#38f9d7)" },
          { id: "expenses" as Tab, label: "Expenses", desc: "Bills & spending",  gradient: "linear-gradient(145deg,#fa709a,#fee140)" },
          { id: "settings" as Tab, label: "Family",   desc: "Manage members",   gradient: "linear-gradient(145deg,#a18cd1,#fbc2eb)" },
        ]).map(({ id, label, desc, gradient }) => (
          <button key={id} onClick={() => onNavigate(id)} style={{
            background: gradient, borderRadius: "20px", border: "none",
            padding: "1.375rem", textAlign: "left", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)", transition: "transform 0.15s, box-shadow 0.15s",
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.18)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)" }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <NavIcon id={id} size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff", letterSpacing: "-0.01em" }}>{label}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", marginTop: "0.1rem" }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Today's expenses (if any) */}
      {todayExpenses.length > 0 && (
        <section style={{ ...sectionCard, marginBottom: "1.5rem" }}>
          <SectionHeader title="Today's Expenses" accent="#F97316" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {todayExpenses.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#F97316,#EAB308)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="17"/><path d="M15 9a3 3 0 00-6 0c0 2 6 2 6 4a3 3 0 01-6 0"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                  {e.category && <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{e.category}</div>}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#F97316", flexShrink: 0 }}>${Number(e.amount).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

interface GCalEvent { id: string | null; title: string; start: string | null; end: string | null; allDay: boolean; location: string | null; description?: string | null }

// ── ICS Import Modal ──────────────────────────────────────────────────────────
function IcsImportModal({ kids, importing, importResult, fileInputRef, onImport, onClose }: {
  kids: KidRow[]
  importing: boolean
  importResult: { imported: number; skipped: number } | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onImport: (icsText: string, memberName: string) => void
  onClose: () => void
}) {
  const [selectedMember, setSelectedMember] = useState<string>("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [icsText, setIcsText] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const allMembers = ["Family", ...kids.map((k) => k.name)]

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".ics")) { setFileError("Please select a .ics file"); return }
    setFileName(file.name)
    setFileError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setIcsText(ev.target?.result as string)
    reader.readAsText(file)
  }

  const canImport = !!icsText && !!selectedMember && !importing

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(129,140,248,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>↑ Import Calendar (.ics)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>✕</button>
        </div>

        {importResult ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            {importResult.imported === -1
              ? <p style={{ color: "#f87171", fontWeight: 600 }}>⚠ Import failed — invalid file or server error.</p>
              : <>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
                  <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>Import complete!</p>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {importResult.imported} event{importResult.imported !== 1 ? "s" : ""} added
                    {importResult.skipped > 0 ? ` · ${importResult.skipped} duplicate${importResult.skipped !== 1 ? "s" : ""} skipped` : ""}
                  </p>
                </>
            }
            <button onClick={onClose} style={{ marginTop: "1.25rem", ...savePillStyle, background: "linear-gradient(135deg,#818cf8,#6366f1)" }}>Done</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={fieldLabelStyle}>1. Select family member *</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {allMembers.map((m, i) => {
                  const color = i === 0 ? "#6b7280" : memberColor(i)
                  const active = selectedMember === m
                  return (
                    <button key={m} onClick={() => setSelectedMember(m)} style={{
                      padding: "0.35rem 0.875rem", borderRadius: "20px",
                      border: `1.5px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                      background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                      color: active ? color : "var(--muted)", fontSize: "0.8rem",
                      fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                    }}>{m}</button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={fieldLabelStyle}>2. Choose .ics file *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: "0.5rem", border: `2px dashed ${fileName ? "rgba(129,140,248,0.4)" : "rgba(255,255,255,0.12)"}`, borderRadius: "12px", padding: "1.25rem", textAlign: "center", cursor: "pointer", background: fileName ? "rgba(129,140,248,0.06)" : "none", transition: "all 0.15s" }}
              >
                {fileName
                  ? <p style={{ color: "#818cf8", fontWeight: 600, fontSize: "0.875rem" }}>📄 {fileName}</p>
                  : <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>Click to browse — only .ics files accepted</p>
                }
              </div>
              <input ref={fileInputRef} type="file" accept=".ics" onChange={handleFile} style={{ display: "none" }} />
              {fileError && <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.35rem" }}>{fileError}</p>}
            </div>

            <p style={{ fontSize: "0.72rem", color: "var(--muted)", opacity: 0.7, background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
              Duplicates (same title + date) will be merged automatically.
            </p>

            <div style={{ display: "flex", gap: "0.625rem", marginTop: "0.25rem" }}>
              <button onClick={onClose} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
              <button
                onClick={() => { if (canImport) onImport(icsText!, selectedMember) }}
                disabled={!canImport}
                style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: canImport ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", background: canImport ? "linear-gradient(135deg,#818cf8,#6366f1)" : "rgba(129,140,248,0.25)" }}
              >
                {importing ? "Importing…" : "Import Events"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab({ events, onDeleteEvent, onUpdateEvent, showAddEvent, setShowAddEvent, newEventTitle, setNewEventTitle, newEventDate, setNewEventDate, newEventTime, setNewEventTime, onAddEvent, saving, provider, kids, scannedEvents, gcalEvents, setGcalEvents, gcalLoaded, setGcalLoaded, onEventsRefresh }: {
  events: Event[]; onDeleteEvent: (id: string) => void;
  onUpdateEvent: (id: string, data: Partial<Event>) => void;
  showAddEvent: boolean; setShowAddEvent: (v: boolean) => void;
  newEventTitle: string; setNewEventTitle: (v: string) => void;
  newEventDate: string; setNewEventDate: (v: string) => void;
  newEventTime: string; setNewEventTime: (v: string) => void;
  onAddEvent: () => void; saving: boolean; provider: string;
  kids: KidRow[]; scannedEvents: ScannedEventRow[];
  gcalEvents: GCalEvent[]; setGcalEvents: (e: GCalEvent[]) => void;
  gcalLoaded: boolean; setGcalLoaded: (v: boolean) => void;
  onEventsRefresh: (evs: Event[]) => void;
}) {
  const [view, setView] = useState<CalView>("day")
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d
  })
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState("")
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedGcalEvent, setSelectedGcalEvent] = useState<GCalEvent | null>(null)
  const [gcalEditMode, setGcalEditMode] = useState(false)
  const [gcalDraft, setGcalDraft] = useState({ title: "", event_date: "", start_time: "", end_time: "" })
  const [gcalSaving, setGcalSaving] = useState(false)

  function openGcalModal(ev: GCalEvent) {
    const date = ev.start ? ev.start.split("T")[0] : todayStr()
    const startTime = !ev.allDay && ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) : ""
    const endTime = !ev.allDay && ev.end?.includes("T") ? ev.end.split("T")[1]?.slice(0, 5) : ""
    setGcalDraft({ title: ev.title, event_date: date, start_time: startTime, end_time: endTime })
    setGcalEditMode(false)
    openGcalModal(ev)
  }

  function removeGcalEvent(ev: GCalEvent) {
    setGcalEvents(gcalEvents.filter((e) => e.id !== ev.id))
    setSelectedGcalEvent(null)
    setGcalEditMode(false)
  }

  async function saveGcalEdit() {
    if (!gcalDraft.title.trim() || !gcalDraft.event_date) return
    setGcalSaving(true)
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: gcalDraft.title.trim(), event_date: gcalDraft.event_date, start_time: gcalDraft.start_time || null, end_time: gcalDraft.end_time || null, description: selectedGcalEvent?.description || null, source: "gcal" }),
    })
    if (res.ok) {
      const { event } = await res.json()
      onEventsRefresh([...events, event])
      if (selectedGcalEvent) removeGcalEvent(selectedGcalEvent)
    }
    setGcalSaving(false)
  }

  // All family members: parent first, then kids
  const parentName = ""
  const memberList = [{ name: "All", color: "#6b7280" }, ...kids.map((k, i) => ({ name: k.name, color: memberColor(i + 1) }))]

  // Scanned events with a known date — shown as read-only blocks in calendar
  const scheduledScanned = scannedEvents.filter((e) => !!e.event_date && e.auto_add_to_calendar)

  function scannedForDate(ds: string) {
    return scheduledScanned.filter((e) => String(e.event_date ?? "").slice(0, 10) === ds)
  }

  function filteredScanned(events: ScannedEventRow[]) {
    if (!memberFilter) return events
    return events.filter((e) => (e.kid_name ?? "").toLowerCase() === memberFilter.toLowerCase())
  }

  function kidColor(kidName: string | null) {
    if (!kidName) return "#818cf8"
    const idx = kids.findIndex((k) => k.name.toLowerCase() === (kidName ?? "").toLowerCase())
    return idx >= 0 ? memberColor(idx + 1) : "#60a5fa"
  }

  useEffect(() => {
    if (provider !== "google" || gcalLoaded) return   // delta: only fetch once
    setGcalLoading(true)
    fetch("/api/gcal")
      .then(async (r) => {
        const d = await r.json()
        if (r.status === 401 || d.error === "token_expired") {
          setGcalError("session_expired")
        } else if (d.error === "gcal_error") {
          setGcalError("gcal_error")
        } else if (Array.isArray(d.events)) {
          setGcalEvents(d.events)
          setGcalLoaded(true)
        } else {
          setGcalError("session_expired")
        }
        setGcalLoading(false)
      })
      .catch(() => { setGcalError("network_error"); setGcalLoading(false) })
  }, [provider, gcalLoaded])

  const today = todayStr()

  function gcalEventsForDate(ds: string) {
    return gcalEvents.filter((e) => e.start && (e.start.split("T")[0] === ds || e.start === ds))
  }

  function getWeekDays() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d
    })
  }

  function getMonthDays() {
    const y = monthDate.getFullYear(), m = monthDate.getMonth()
    const first = new Date(y, m, 1).getDay()
    const days: (Date | null)[] = Array(first).fill(null)
    const total = new Date(y, m + 1, 0).getDate()
    for (let i = 1; i <= total; i++) days.push(new Date(y, m, i))
    return days
  }

  function eventsForDate(d: Date) {
    const ds = d.toISOString().split("T")[0]
    return events.filter((e) => e.event_date === ds)
  }

  return (
    <>
      {/* GCal event detail / edit modal */}
      {selectedGcalEvent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => { setSelectedGcalEvent(null); setGcalEditMode(false) }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "480px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>📅 {gcalEditMode ? "Edit Event" : "Event Details"}</h3>
              <button onClick={() => { setSelectedGcalEvent(null); setGcalEditMode(false) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {!gcalEditMode ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div><div style={fieldLabelStyle}>Title</div><div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "0.2rem" }}>{selectedGcalEvent.title}</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div><div style={fieldLabelStyle}>Date</div><div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>{selectedGcalEvent.start ? selectedGcalEvent.start.split("T")[0] : "—"}</div></div>
                    <div><div style={fieldLabelStyle}>Time</div><div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>
                      {selectedGcalEvent.allDay ? "All day" : selectedGcalEvent.start?.includes("T") ? fmtTime(selectedGcalEvent.start.split("T")[1]?.slice(0, 5) ?? "") : "—"}
                      {!selectedGcalEvent.allDay && selectedGcalEvent.end?.includes("T") ? ` → ${fmtTime(selectedGcalEvent.end.split("T")[1]?.slice(0, 5) ?? "")}` : ""}
                    </div></div>
                  </div>
                  {selectedGcalEvent.location && <div><div style={fieldLabelStyle}>Location</div><div style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>{selectedGcalEvent.location}</div></div>}
                  {selectedGcalEvent.description && <div><div style={fieldLabelStyle}>Description</div><div style={{ fontSize: "0.82rem", marginTop: "0.2rem", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{selectedGcalEvent.description}</div></div>}
                  <div><div style={fieldLabelStyle}>Source</div><div style={{ fontSize: "0.78rem", color: "#818cf8", marginTop: "0.2rem" }}>Google Calendar</div></div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => removeGcalEvent(selectedGcalEvent)} style={{ padding: "0.65rem 1rem", borderRadius: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Remove</button>
                  <button onClick={() => setGcalEditMode(true)} style={{ flex: 1, padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Edit Event</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div><label style={fieldLabelStyle}>Title</label><input autoFocus value={gcalDraft.title} onChange={(e) => setGcalDraft((d) => ({ ...d, title: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div><label style={fieldLabelStyle}>Date</label><input type="date" value={gcalDraft.event_date} onChange={(e) => setGcalDraft((d) => ({ ...d, event_date: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                    <div><label style={fieldLabelStyle}>Start Time</label><input type="time" value={gcalDraft.start_time} onChange={(e) => setGcalDraft((d) => ({ ...d, start_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                  </div>
                  <div><label style={fieldLabelStyle}>End Time</label><input type="time" value={gcalDraft.end_time} onChange={(e) => setGcalDraft((d) => ({ ...d, end_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => setGcalEditMode(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "10px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                  <button onClick={saveGcalEdit} disabled={gcalSaving || !gcalDraft.title.trim() || !gcalDraft.event_date} style={{ flex: 2, padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{gcalSaving ? "Saving…" : "Save Changes"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Calendar</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {(["day","week","month"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "0.4rem 0.875rem", borderRadius: "8px", border: "none", cursor: "pointer",
              background: view === v ? "linear-gradient(135deg,#34d399,#059669)" : "rgba(255,255,255,0.06)",
              color: view === v ? "#fff" : "var(--muted)", fontSize: "0.8rem", fontWeight: view === v ? 700 : 400,
              fontFamily: "'Inter',sans-serif", textTransform: "capitalize",
            }}>{v}</button>
          ))}
          <button onClick={() => { setShowImport(true); setImportResult(null) }} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "8px", padding: "0.4rem 0.75rem", color: "#818cf8", fontSize: "0.78rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>↑ Import .ics</button>
          <button onClick={() => setShowAddEvent(true)} style={{ ...savePillStyle, marginLeft: "0.25rem" }}>+ Add</button>
        </div>
      </div>

      {showAddEvent && <AddEventModal title={newEventTitle} setTitle={setNewEventTitle} date={newEventDate} setDate={setNewEventDate} time={newEventTime} setTime={setNewEventTime} onSave={onAddEvent} onCancel={() => setShowAddEvent(false)} saving={saving} />}

      {showImport && (
        <IcsImportModal
          kids={kids}
          importing={importing}
          importResult={importResult}
          fileInputRef={fileInputRef}
          onImport={async (icsText, memberName) => {
            setImporting(true)
            const res = await fetch("/api/events/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ icsText, memberName }),
            })
            const data = await res.json()
            setImporting(false)
            if (res.ok) {
              setImportResult({ imported: data.imported, skipped: data.skipped })
              // Reload events via page refresh or re-fetch
              const evRes = await fetch("/api/events")
              const evData = await evRes.json()
              if (evData.events) onEventsRefresh(evData.events)
            } else {
              setImportResult({ imported: -1, skipped: 0 })
            }
          }}
          onClose={() => { setShowImport(false); setImportResult(null) }}
        />
      )}

      {/* Family member filter */}
      {kids.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {memberList.map((m) => {
            const active = m.name === "All" ? memberFilter === null : memberFilter === m.name
            return (
              <button key={m.name} onClick={() => setMemberFilter(m.name === "All" ? null : m.name)} style={{
                padding: "0.25rem 0.75rem", borderRadius: "20px", border: `1.5px solid ${active ? m.color : "rgba(255,255,255,0.1)"}`,
                background: active ? `${m.color}22` : "rgba(255,255,255,0.04)",
                color: active ? m.color : "var(--muted)", fontSize: "0.73rem", fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: "'Inter',sans-serif",
              }}>
                {m.name === "All" ? "All Members" : m.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Google Calendar status */}
      {provider === "google" && (
        <div style={{ marginBottom: "1rem", fontSize: "0.78rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {gcalLoading && <span>⟳ Loading Google Calendar…</span>}
          {gcalError === "session_expired" && (
            <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⚠ Google session expired —{" "}
              <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#fbbf24", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                sign out and sign back in
              </button>
              {" "}to reconnect.
            </span>
          )}
          {gcalError === "gcal_error" && (
            <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⚠ Google Calendar error —{" "}
              <button onClick={() => { setGcalError(""); setGcalLoading(true); fetch("/api/gcal").then(async (r) => { const d = await r.json(); if (r.status === 401 || d.error === "token_expired") setGcalError("session_expired"); else if (Array.isArray(d.events)) { setGcalEvents(d.events); setGcalError("") } else setGcalError("gcal_error"); setGcalLoading(false) }).catch(() => { setGcalError("network_error"); setGcalLoading(false) }) }} style={{ background: "none", border: "none", color: "#f87171", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                retry
              </button>
            </span>
          )}
          {gcalError === "network_error" && (
            <span style={{ color: "#f87171" }}>⚠ Could not reach Google Calendar — check your connection</span>
          )}
          {!gcalLoading && !gcalError && gcalEvents.length === 0 && (
            <span style={{ color: "var(--muted)", opacity: 0.6 }}>No upcoming Google Calendar events</span>
          )}
          {!gcalLoading && !gcalError && gcalEvents.length > 0 && (
            <span style={{ color: "#34d399" }}>✓ {gcalEvents.length} Google Calendar events synced</span>
          )}
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div style={{ maxWidth: "600px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>Today · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          {(() => {
            const todayScanned = filteredScanned(scannedForDate(today))
            const totalItems = events.length + gcalEventsForDate(today).length + todayScanned.length
            return totalItems === 0
              ? <Empty text="No events for today" />
              : <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {events.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} onUpdate={onUpdateEvent} kids={kids} />)}
                  {gcalEventsForDate(today).map((ev) => <GCalEventRow key={ev.id} event={ev} onClick={() => openGcalModal(ev)} />)}
                  {todayScanned.map((ev) => <ScannedEventBlock key={ev.id} ev={ev} color={kidColor(ev.kid_name)} />)}
                </div>
          })()}
        </div>
      )}

      {/* WEEK VIEW — time grid */}
      {view === "week" && (() => {
        const HOUR_H = 64, START_H = 7, END_H = 21
        const HOURS = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)
        function toY(time: string | null): number {
          if (!time) return 0
          const [h, m] = time.split(":").map(Number)
          return ((h * 60 + (m || 0)) - START_H * 60) * (HOUR_H / 60)
        }
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
        const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
        const days = getWeekDays()
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} style={navArrow}>←</button>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500 }}>{weekLabel}</span>
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} style={navArrow}>→</button>
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
              {/* Day header row */}
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)", background: "rgba(10,8,20,0.8)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 5 }}>
                <div />
                {days.map((day) => {
                  const ds = day.toISOString().split("T")[0]; const isToday = ds === today
                  return (
                    <div key={ds} style={{ textAlign: "center", padding: "0.5rem 0.25rem", borderLeft: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.6rem", color: isToday ? "#34d399" : "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.1rem" }}>
                        <span style={isToday ? { background: "#34d399", borderRadius: "50%", width: "30px", height: "30px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#000", fontSize: "0.95rem" } : { color: "var(--text)" }}>{day.getDate()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* All-day row */}
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)", borderBottom: "2px solid var(--border)", minHeight: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0.2rem 0.5rem 0.2rem 0", fontSize: "0.58rem", color: "var(--muted)" }}>all day</div>
                {days.map((day) => {
                  const ds = day.toISOString().split("T")[0]
                  const allDay = gcalEventsForDate(ds).filter((e) => e.allDay)
                  return (
                    <div key={ds} style={{ borderLeft: "1px solid var(--border)", padding: "0.125rem 0.2rem" }}>
                      {allDay.map((ev) => (
                        <div key={ev.id ?? ev.title} onClick={() => openGcalModal(ev)} style={{ fontSize: "0.62rem", background: "rgba(99,102,241,0.2)", borderLeft: "2px solid #818cf8", borderRadius: "3px", padding: "0.1rem 0.3rem", color: "#818cf8", cursor: "pointer", marginBottom: "1px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>
                      ))}
                    </div>
                  )
                })}
              </div>
              {/* Scrollable time body */}
              <div style={{ overflowY: "auto", maxHeight: "540px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,1fr)" }}>
                  {/* Time labels */}
                  <div>
                    {HOURS.map((h, i) => (
                      <div key={h} style={{ height: HOUR_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: "0.4rem" }}>
                        {i > 0 && <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: "-0.45em" }}>{`${h % 12 || 12}${h < 12 ? "AM" : "PM"}`}</span>}
                      </div>
                    ))}
                  </div>
                  {/* Day columns */}
                  {days.map((day) => {
                    const ds = day.toISOString().split("T")[0]
                    const isToday = ds === today
                    const dayEvs = eventsForDate(day).filter((e) => !!e.start_time)
                    const gcEvs = gcalEventsForDate(ds).filter((e) => !e.allDay)
                    const scEvs = filteredScanned(scannedForDate(ds)).filter((e) => !!e.start_time)
                    const totalH = HOURS.length * HOUR_H
                    return (
                      <div key={ds} style={{ position: "relative", borderLeft: "1px solid var(--border)", height: totalH, background: isToday ? "rgba(52,211,153,0.025)" : "transparent" }}>
                        {HOURS.map((h) => (
                          <div key={h} style={{ position: "absolute", top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />
                        ))}
                        {/* Local events */}
                        {dayEvs.map((ev) => {
                          const top = toY(ev.start_time); const bot = toY(ev.end_time); const h = Math.max(22, bot - top || HOUR_H / 2)
                          return <div key={ev.id} onClick={() => {/* EventRow handles its own modal */}} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: "rgba(52,211,153,0.18)", borderLeft: "3px solid #34d399", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                            {ev.start_time && <div style={{ fontSize: "0.55rem", color: "#34d399", fontWeight: 700 }}>{fmtTime(ev.start_time)}</div>}
                            <div style={{ fontSize: "0.6rem", color: "#34d399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          </div>
                        })}
                        {/* GCal events */}
                        {gcEvs.map((ev) => {
                          const t = ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) : null
                          const te = ev.end?.includes("T") ? ev.end.split("T")[1]?.slice(0, 5) : null
                          const top = toY(t); const h = Math.max(22, toY(te) - top || HOUR_H / 2)
                          return <div key={ev.id ?? ev.title} onClick={() => openGcalModal(ev)} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: "rgba(99,102,241,0.18)", borderLeft: "3px solid #818cf8", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                            {t && <div style={{ fontSize: "0.55rem", color: "#818cf8", fontWeight: 700 }}>{fmtTime(t)}</div>}
                            <div style={{ fontSize: "0.6rem", color: "#818cf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          </div>
                        })}
                        {/* Scanned events */}
                        {scEvs.map((ev) => {
                          const c = kidColor(ev.kid_name); const top = toY(ev.start_time); const h = Math.max(22, toY(ev.end_time) - top || HOUR_H / 2)
                          return <div key={ev.id} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: `${c}22`, borderLeft: `3px solid ${c}`, borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "default", zIndex: 1 }}>
                            {ev.start_time && <div style={{ fontSize: "0.55rem", color: c, fontWeight: 700 }}>{fmtTime(ev.start_time)}</div>}
                            <div style={{ fontSize: "0.6rem", color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.calendar_title ?? ev.title}</div>
                          </div>
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MONTH VIEW */}
      {view === "month" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navArrow}>←</button>
            <span style={{ fontSize: "1rem", fontWeight: 700 }}>{monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navArrow}>→</button>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            {/* Day-of-week header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "rgba(10,8,20,0.8)" }}>
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d) => (
                <div key={d} style={{ padding: "0.5rem 0.375rem", fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, borderRight: "1px solid var(--border)", textAlign: "center" }}>{d}</div>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {(() => {
                const days = getMonthDays()
                // pad to complete last row
                while (days.length % 7 !== 0) days.push(null)
                return days.map((day, idx) => {
                  if (!day) return <div key={idx} style={{ minHeight: "108px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.18)" }} />
                  const ds = day.toISOString().split("T")[0]
                  const isToday = ds === today
                  const isCurMonth = day.getMonth() === monthDate.getMonth()
                  const LIMIT = 3
                  const allEvs = [
                    ...eventsForDate(day).map((ev) => ({ key: ev.id, time: ev.start_time, label: ev.title, color: "#34d399", onClick: undefined as (() => void) | undefined })),
                    ...gcalEventsForDate(ds).map((ev) => ({ key: ev.id ?? ev.title, time: !ev.allDay && ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) : null, label: ev.title, color: "#818cf8", onClick: () => openGcalModal(ev) })),
                    ...filteredScanned(scannedForDate(ds)).map((ev) => ({ key: ev.id, time: ev.start_time, label: ev.calendar_title ?? ev.title, color: kidColor(ev.kid_name), onClick: undefined as (() => void) | undefined })),
                  ]
                  const visible = allEvs.slice(0, LIMIT)
                  const overflow = allEvs.length - LIMIT
                  return (
                    <div key={ds} style={{ minHeight: "108px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "0.3rem 0.25rem", background: isToday ? "rgba(99,102,241,0.06)" : isCurMonth ? "transparent" : "rgba(0,0,0,0.12)" }}>
                      {/* Date number */}
                      <div style={{ marginBottom: "0.25rem" }}>
                        <span style={{ display: "inline-flex", width: "22px", height: "22px", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "#6366f1" : "transparent", color: isToday ? "#fff" : isCurMonth ? "var(--text)" : "var(--muted)", fontSize: "0.75rem", fontWeight: isToday ? 700 : 400 }}>{day.getDate()}</span>
                      </div>
                      {/* Events */}
                      {visible.map((item) => (
                        <div key={item.key} onClick={item.onClick} style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.6rem", padding: "0.1rem 0.25rem", marginBottom: "0.15rem", borderRadius: "3px", background: `${item.color}18`, borderLeft: `2px solid ${item.color}`, color: item.color, cursor: item.onClick ? "pointer" : "default", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {item.time && <span style={{ flexShrink: 0, fontWeight: 700 }}>{fmtTime(item.time)}</span>}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                        </div>
                      ))}
                      {overflow > 0 && <div style={{ fontSize: "0.58rem", color: "#6366f1", fontWeight: 600, padding: "0.05rem 0.25rem" }}>+{overflow} more</div>}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
function TasksTab({ pending, done, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, onAddTask, onToggleTask, onDeleteTask, saving }: {
  pending: Task[]; done: Task[];
  showAddTask: boolean; setShowAddTask: (v: boolean) => void;
  newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  onAddTask: () => void; onToggleTask: (id: string, c: boolean) => void;
  onDeleteTask: (id: string) => void; saving: boolean;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Tasks & Chores</h2>
        <button onClick={() => setShowAddTask(true)} style={savePillStyle}>+ Add task</button>
      </div>
      {showAddTask && <AddTaskModal title={newTaskTitle} setTitle={setNewTaskTitle} onSave={onAddTask} onCancel={() => setShowAddTask(false)} saving={saving} />}
      <div style={{ maxWidth: "600px" }}>
        {pending.length === 0 && done.length === 0 && <Empty text="No tasks yet — add one above!" />}
        {pending.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>{pending.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} />)}</div>}
        {done.length > 0 && (
          <>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Completed</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>{done.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} />)}</div>
          </>
        )}
      </div>
    </>
  )
}

// ── Insights helpers (must be outside InsightsTab to avoid React crash) ───────
function insightsDaysUntil(date: string, today: string) {
  const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000)
  if (diff === 0) return { label: "Today", color: "#f472b6" }
  if (diff === 1) return { label: "Tomorrow", color: "#fbbf24" }
  if (diff <= 7) return { label: `In ${diff}d`, color: "#34d399" }
  if (diff <= 30) return { label: `In ${diff}d`, color: "#60a5fa" }
  return { label: `In ${diff}d`, color: "var(--muted)" }
}
function insightsFmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}
function EventCard({ ev, showType, today }: { ev: ScannedEventRow; showType?: boolean; today: string }) {
  const [expanded, setExpanded] = useState(false)
  const dateStr = ev.event_date ? String(ev.event_date).slice(0, 10) : null
  const isUpcoming = !!dateStr && dateStr >= today
  const countdown = dateStr && isUpcoming ? insightsDaysUntil(dateStr, today) : null
  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{ background: expanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${ev.urgency === "high" ? "rgba(248,113,113,0.3)" : expanded ? "rgba(99,102,241,0.4)" : "var(--border)"}`, borderRadius: "12px", padding: "0.875rem 1rem", cursor: "pointer", transition: "all 0.15s" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{EVENT_TYPE_ICON[ev.event_type] ?? "📧"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{ev.calendar_title ?? ev.title}</span>
            {ev.urgency === "high" && <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}>URGENT</span>}
            {ev.kid_name && <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.05rem 0.4rem", borderRadius: "20px", background: "rgba(244,114,182,0.15)", color: "#f472b6", border: "1px solid rgba(244,114,182,0.3)" }}>{ev.kid_name}{ev.grade ? ` · ${ev.grade}` : ""}</span>}
            {showType && <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(255,255,255,0.07)", color: "var(--muted)", border: "1px solid var(--border)" }}>{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}</span>}
            {countdown && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.05rem 0.4rem", borderRadius: "20px", background: `${countdown.color}22`, color: countdown.color, border: `1px solid ${countdown.color}44`, marginLeft: "auto" }}>{countdown.label}</span>}
            <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
          </div>
          {dateStr && (
            <p style={{ fontSize: "0.72rem", color: isUpcoming ? "#fbbf24" : "var(--muted)", marginBottom: "0.2rem" }}>
              📆 {insightsFmtDate(dateStr)}{ev.start_time ? ` · ${fmtTime(ev.start_time)}` : ""}{ev.end_time ? ` – ${fmtTime(ev.end_time)}` : ""}
            </p>
          )}
          {ev.special_instructions && (
            <div style={{ fontSize: "0.72rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "6px", padding: "0.25rem 0.5rem", margin: "0.25rem 0", color: "#fbbf24" }}>⚡ {ev.special_instructions}</div>
          )}
          {(ev.event_type === "subscription" || ev.event_type === "invoice" || ev.event_type === "bill") && (
            <p style={{ fontSize: "0.72rem", color: "#818cf8", marginTop: "0.2rem" }}>
              {ev.vendor ?? ev.organization_name ?? ""}{ev.amount != null ? ` · $${Number(ev.amount).toFixed(2)}` : ""}{ev.recurrence ? ` / ${ev.recurrence === "one_time" ? "once" : ev.recurrence}` : ""}
            </p>
          )}
          {!dateStr && ev.event_type !== "subscription" && ev.event_type !== "invoice" && ev.event_type !== "bill" && !expanded && (
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", opacity: 0.5, marginTop: "0.15rem" }}>{(ev.snippet ?? "").slice(0, 120)}{(ev.snippet ?? "").length > 120 ? "…" : ""}</p>
          )}
          {/* Expanded detail panel */}
          {expanded && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {ev.organization_name && (
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>🏢 <strong style={{ color: "var(--text)" }}>{ev.organization_name}</strong>{ev.organization_type ? ` · ${ev.organization_type.replace("_", " ")}` : ""}</p>
              )}
              {ev.source_from && (
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>✉ {ev.source_from}</p>
              )}
              {ev.school_name && (
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>🏫 {ev.school_name}</p>
              )}
              {ev.grade && (
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.3rem" }}>📚 Grade: {ev.grade}</p>
              )}
              {ev.snippet && (
                <div style={{ marginTop: "0.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0.625rem 0.75rem" }}>
                  <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Email preview</p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ev.snippet}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
function InsightsSectionHeader({ icon, title, count, accent }: { icon: string; title: string; count: number; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", marginTop: "0.25rem" }}>
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "'Outfit',sans-serif", color: accent }}>{title}</span>
      <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.05rem 0.4rem", borderRadius: "10px", background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>{count}</span>
    </div>
  )
}

// ── Category definitions for dynamic Insights nav ────────────────────────────
const INSIGHT_CATEGORIES = [
  { id: "activities",    label: "Activities",    icon: "⚽", accent: "#60a5fa", types: ["activity","recital"] },
  { id: "school",        label: "School",        icon: "🏫", accent: "#34d399", types: ["school_event","field_trip","no_school","special_day"] },
  { id: "medical",       label: "Medical",       icon: "🩺", accent: "#a78bfa", types: ["medical"] },
  { id: "appointments",  label: "Appointments",  icon: "📋", accent: "#f472b6", types: ["appointment","calendar_invite"] },
  { id: "subscriptions", label: "Payments", icon: "💳", accent: "#818cf8", types: ["subscription","invoice","bill"] },
]

function sortEvents(evts: ScannedEventRow[], order: "newest" | "oldest") {
  return [...evts].sort((a, b) => {
    const da = String(a.event_date ?? ""), db = String(b.event_date ?? "")
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return order === "newest" ? db.localeCompare(da) : da.localeCompare(db)
  })
}

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab({ scannedEvents, signedUpAt, provider, onRefresh, kids }: { scannedEvents: ScannedEventRow[]; signedUpAt: string; provider: string; onRefresh: () => Promise<{ error?: string }>; kids: KidRow[] }) {
  const [section, setSection] = useState<string>("dashboard")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  async function handleRefresh() {
    setRefreshing(true); setScanError(null)
    const result = await onRefresh()
    if (result.error) setScanError(result.error)
    else setLastRefreshed(new Date().toLocaleTimeString())
    setRefreshing(false)
  }

  const today = todayStr()
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]

  const all = scannedEvents
  const actionNeeded = sortEvents(all.filter((e) => e.urgency === "high" || !!e.special_instructions), sortOrder)
  const thisWeek = all
    .filter((e) => { const d = e.event_date ? String(e.event_date).slice(0, 10) : null; return d && d >= today && d <= in7 })
    .sort((a, b) => String(a.event_date ?? "").localeCompare(String(b.event_date ?? "")))

  // Build category groups (only ones with events → dynamic nav)
  const categoryData = INSIGHT_CATEGORIES.map((cat) => ({
    ...cat,
    events: sortEvents(all.filter((e) => cat.types.includes(e.event_type)), sortOrder),
  })).filter((c) => c.events.length > 0)

  const subscriptions = categoryData.find((c) => c.id === "subscriptions")?.events ?? []
  const activities    = categoryData.find((c) => c.id === "activities")?.events ?? []
  const monthlyTotal  = subscriptions.filter((e) => e.recurrence === "monthly").reduce((s, e) => s + Number(e.amount ?? 0), 0)
  const annualTotal   = subscriptions.filter((e) => e.recurrence === "annual").reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const errorBanner = scanError === "token_expired"
    ? <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#fbbf24" }}>⚠ Google session expired — <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#fbbf24", textDecoration: "underline", cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>sign out and back in</button> to reconnect.</div>
    : scanError
    ? <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#f87171" }}>⚠ Scan failed — please try again.</div>
    : null

  const activeSectionEvents = section === "dashboard" ? []
    : section === "all" ? sortEvents(all, sortOrder)
    : section === "thisweek" ? sortEvents(thisWeek, sortOrder)
    : section === "action" ? sortEvents(actionNeeded, sortOrder)
    : categoryData.find((c) => c.id === section)?.events ?? []

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Insights</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            {all.length} emails · {thisWeek.length} this week · {actionNeeded.length} action needed
            {lastRefreshed && <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>· Updated {lastRefreshed}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
          {/* Sort toggle */}
          <button onClick={() => setSortOrder((o) => o === "newest" ? "oldest" : "newest")} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.4rem 0.75rem", color: "var(--muted)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            {sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}
          </button>
          {provider === "google" && (
            <button onClick={handleRefresh} disabled={refreshing} style={{ ...savePillStyle, background: refreshing ? "rgba(251,191,36,0.3)" : "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#000" }}>
              {refreshing ? "Scanning…" : "↻ Scan Inbox"}
            </button>
          )}
        </div>
      </div>

      {errorBanner}

      {/* Dynamic section nav */}
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[{ id: "dashboard", label: "Dashboard", icon: "🏠", count: undefined },
          { id: "thisweek", label: "This Week", icon: "📅", count: thisWeek.length },
          { id: "action", label: "Action Needed", icon: "⚡", count: actionNeeded.length },
          ...categoryData.map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: c.events.length })),
          { id: "all", label: "All Emails", icon: "📧", count: all.length }
        ].map(({ id, label, icon, count }) => (
          <button key={id} onClick={() => setSection(id)} style={{
            padding: "0.3rem 0.75rem", borderRadius: "20px", border: "none", cursor: "pointer",
            background: section === id ? "#fbbf24" : "rgba(255,255,255,0.06)",
            color: section === id ? "#000" : "var(--muted)",
            fontSize: "0.75rem", fontWeight: section === id ? 700 : 400,
            fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: "0.3rem",
          }}>
            {icon} {label}
            {count !== undefined && count > 0 && (
              <span style={{ background: section === id ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.05rem 0.35rem", fontSize: "0.6rem", fontWeight: 700 }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <div style={{ ...sectionCard, textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
          <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>No insights yet</p>
          <p style={{ fontSize: "0.85rem" }}>Click "Scan Inbox" to analyse your Gmail for school events, appointments, activities, and subscriptions.</p>
        </div>
      ) : section === "dashboard" ? (
        // ── DASHBOARD VIEW ──
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem" }}>
            {[
              { label: "This Week", value: thisWeek.length, icon: "📅", color: "#34d399", sub: "upcoming events", sectionId: "thisweek" },
              { label: "Action Needed", value: actionNeeded.length, icon: "⚡", color: "#f87171", sub: "need attention", sectionId: "action" },
              { label: "Activities", value: activities.length, icon: "⚽", color: "#60a5fa", sub: "kids activities", sectionId: "activities" },
              { label: "Monthly Cost", value: monthlyTotal > 0 ? `$${monthlyTotal.toFixed(0)}` : "–", icon: "💳", color: "#818cf8", sub: "in subscriptions", sectionId: "subscriptions" },
            ].map(({ label, value, icon, color, sub, sectionId }) => (
              <div key={label} onClick={() => setSection(sectionId)} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "14px", padding: "1rem", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = color}
                onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = `${color}33`}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{icon}</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color, fontFamily: "'Outfit',sans-serif" }}>{value}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>{sub}</div>
                <div style={{ fontSize: "0.6rem", color, opacity: 0.6, marginTop: "0.2rem" }}>tap to view →</div>
              </div>
            ))}
          </div>

          {actionNeeded.length > 0 && (
            <div>
              <InsightsSectionHeader icon="⚡" title="Action Needed" count={actionNeeded.length} accent="#f87171" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {actionNeeded.slice(0, 5).map((ev) => <EventCard key={ev.id} ev={ev} showType today={today} />)}
              </div>
            </div>
          )}

          {thisWeek.length > 0 && (
            <div>
              <InsightsSectionHeader icon="📅" title="This Week" count={thisWeek.length} accent="#34d399" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {thisWeek.map((ev) => <EventCard key={ev.id} ev={ev} showType today={today} />)}
              </div>
            </div>
          )}

          {categoryData.map((cat) => {
            const preview = cat.events.slice(0, cat.id === "subscriptions" ? 6 : 5)
            const remaining = cat.events.length - preview.length
            return (
              <div key={cat.id}>
                <InsightsSectionHeader icon={cat.icon} title={cat.label} count={cat.events.length} accent={cat.accent} />
                {cat.id === "subscriptions" && (monthlyTotal > 0 || annualTotal > 0) && (
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                    {monthlyTotal > 0 && <span style={{ fontSize: "0.78rem", color: "#818cf8", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "8px", padding: "0.3rem 0.625rem", fontWeight: 600 }}>${monthlyTotal.toFixed(2)} / month</span>}
                    {annualTotal > 0 && <span style={{ fontSize: "0.78rem", color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: "8px", padding: "0.3rem 0.625rem", fontWeight: 600 }}>${annualTotal.toFixed(2)} / year</span>}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {preview.map((ev) => <EventCard key={ev.id} ev={ev} today={today} />)}
                  {remaining > 0 && <button onClick={() => setSection(cat.id)} style={{ background: "none", border: "none", color: cat.accent, cursor: "pointer", fontSize: "0.78rem", textAlign: "left", padding: "0.25rem 0" }}>+ {remaining} more →</button>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // ── FILTERED LIST VIEW ──
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {activeSectionEvents.length === 0
            ? <Empty text={`No ${section} emails found`} />
            : activeSectionEvents.map((ev) => <EventCard key={ev.id} ev={ev} showType today={today} />)
          }
        </div>
      )}
    </>
  )
}

// ── Data Map Tab ──────────────────────────────────────────────────────────────
const SCHOOL_TYPES = ["school_event","field_trip","no_school","special_day"]
const ACTIVITY_TYPES = ["activity","recital"]

// ── Grade helpers ─────────────────────────────────────────────────────────────
function calcGrade(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  // School year starts Sept 1; cutoff Dec 31 of that year (Alberta/BC convention)
  const schoolYearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return schoolYearStart - birth.getFullYear() - 5  // 0 = Kindergarten, 1 = Grade 1 …
}

function parseGradeStr(g: string | null): number | null {
  if (!g) return null
  const l = g.toLowerCase()
  if (/junior.?kinder|jk/.test(l)) return -1
  if (/senior.?kinder|sk/.test(l)) return 0
  if (/kinder/.test(l)) return 0
  const m = g.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

// Build school-name → grade-range from AI-extracted grades in emails
function buildSchoolGradeMap(events: ScannedEventRow[]): Map<string, { min: number; max: number }> {
  const tmp = new Map<string, number[]>()
  for (const e of events) {
    if (!e.grade) continue
    const school = (e.school_name ?? e.organization_name ?? "").trim()
    if (!school) continue
    const g = parseGradeStr(e.grade)
    if (g === null) continue
    const arr = tmp.get(school) ?? []
    arr.push(g)
    tmp.set(school, arr)
  }
  const result = new Map<string, { min: number; max: number }>()
  for (const [school, grades] of tmp) {
    result.set(school, { min: Math.min(...grades), max: Math.max(...grades) })
  }
  return result
}

function FactTag({
  fact,
  onDelete,
  onUpdate,
}: {
  fact: FamilyFact
  onDelete?: (id: string) => void
  onUpdate?: (id: string, object: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fact.object)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dotColor = fact.confidence >= 0.85 ? "#34d399" : fact.confidence >= 0.6 ? "#fbbf24" : "#6b7280"
  const confidenceLabel =
    fact.confidence >= 0.85 ? "High confidence" : fact.confidence >= 0.6 ? "Moderate confidence" : "Low confidence"

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(fact.object)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 50)
  }

  async function save() {
    if (!draft.trim() || draft.trim() === fact.object) { setEditing(false); return }
    setSaving(true)
    await onUpdate?.(fact.id, draft.trim())
    setSaving(false)
    setEditing(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") save()
    if (e.key === "Escape") { setEditing(false); setDraft(fact.object) }
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.4)", borderRadius: "8px", padding: "0.25rem 0.5rem" }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          autoFocus
          style={{ background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: "0.78rem", minWidth: "80px", width: `${Math.max(80, draft.length * 8)}px`, maxWidth: "220px" }}
        />
        <button
          onClick={save}
          disabled={saving}
          style={{ background: "#818cf8", border: "none", borderRadius: "4px", color: "white", fontSize: "0.65rem", padding: "0.15rem 0.45rem", cursor: saving ? "wait" : "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
        >{saving ? "…" : "Save"}</button>
        <button
          onClick={() => { setEditing(false); setDraft(fact.object) }}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", lineHeight: 1, padding: "0 0.1rem" }}
        >✕</button>
      </div>
    )
  }

  return (
    <div
      title={`${confidenceLabel} · seen in ${fact.evidence_count} email${fact.evidence_count !== 1 ? "s" : ""} · click to edit`}
      onClick={onUpdate ? startEdit : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.35rem",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "6px", padding: "0.25rem 0.5rem", fontSize: "0.78rem", color: "var(--text)",
        cursor: onUpdate ? "pointer" : "default", userSelect: "none",
        transition: "background 0.12s, border-color 0.12s",
      }}
      onMouseEnter={(e) => { if (onUpdate) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(129,140,248,0.4)" }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.1)" }}
    >
      <span title={confidenceLabel} style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{fact.object}</span>
      {fact.evidence_count > 1 && (
        <span title={`Confirmed by ${fact.evidence_count} emails`} style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.55, background: "rgba(255,255,255,0.06)", borderRadius: "4px", padding: "0 3px" }}>
          {fact.evidence_count} emails
        </span>
      )}
      {onUpdate && (
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.45, marginLeft: "0.1rem" }}>✎</span>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(fact.id) }}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer", padding: "0 0.05rem", lineHeight: 1, opacity: 0.5 }}
          title="Remove this fact"
        >✕</button>
      )}
    </div>
  )
}

function DataMapTab({ profile, kids, facts, scannedEvents, onDeleteFact, onUpdateFact }: {
  profile: ProfileData; kids: KidRow[]; facts: FamilyFact[]
  scannedEvents: ScannedEventRow[]
  onDeleteFact: (id: string) => void
  onUpdateFact: (id: string, object: string) => void
}) {
  const parentName = `${profile.firstName} ${profile.lastName}`.trim() || "Parent"
  // Names that should never appear as school/activity object values
  const familyNameTokens = new Set([
    profile.firstName.toLowerCase(), profile.lastName.toLowerCase(),
    parentName.toLowerCase(),
    ...kids.map((k) => k.name.toLowerCase()),
  ])

  // Only show confirmed + uncertain facts; drop institution-type rows; drop facts where a family
  // member's name was mistakenly extracted as a school/activity/doctor name
  const PERSON_PREDICATES = new Set(["attends_school", "current_grade", "participates_in", "taught_by", "sees_doctor", "sees_dentist"])
  const preFilter = facts.filter((f) => {
    if (f.status === "conflicted" || f.subject_type === "institution") return false
    if (PERSON_PREDICATES.has(f.predicate) && familyNameTokens.has(f.object.toLowerCase())) return false
    return true
  })
  // Deduplicate: if a school name appears in attends_school, remove it from participates_in
  const schoolObjects = new Set(preFilter.filter((f) => f.predicate === "attends_school").map((f) => f.object.toLowerCase()))
  const visibleFacts = preFilter.filter((f) => {
    if (f.predicate === "participates_in" && schoolObjects.has(f.object.toLowerCase())) return false
    return true
  })
  const members = [
    { name: parentName, subjectKey: parentName, isParent: true, icon: "👤", dob: null as string | null },
    ...kids.map((k) => ({ name: k.name, subjectKey: k.name, isParent: false, icon: "👧", dob: k.dob })),
  ]

  // Only show groups that have at least one visible fact across all members
  const activeGroups = FACT_GROUPS.filter((g) =>
    visibleFacts.some((f) => g.predicates.includes(f.predicate))
  )

  // Upcoming events count per member (from scanned_events, attributed)
  const today = todayStr()
  function upcomingFor(memberName: string, isParent: boolean): number {
    const kidNames = new Set(kids.map((k) => k.name.toLowerCase()))
    return scannedEvents.filter((e) => {
      if (!e.event_date || String(e.event_date).slice(0, 10) < today) return false
      if (isParent) return !e.kid_name || !kidNames.has((e.kid_name ?? "").toLowerCase())
      if (memberName === "family") return false
      return (e.kid_name ?? "").toLowerCase() === memberName.toLowerCase()
    }).length
  }

  const conflicted = facts.filter((f) => f.status === "conflicted")

  const cellStyle: React.CSSProperties = { padding: "0.875rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)", verticalAlign: "top" }
  const headerCellStyle: React.CSSProperties = { padding: "0.625rem 1rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" as const }

  // If no facts at all yet, show a prompt to scan inbox
  if (facts.length === 0) {
    return (
      <>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Knowledge Map</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>AI-extracted facts about your family, verified and deduplicated over time</p>
        </div>
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No facts extracted yet</p>
          <p style={{ fontSize: "0.85rem" }}>Go to Insights and click "Scan Inbox" — the system will automatically build your family knowledge graph.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Knowledge Map</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>AI-extracted facts · verified over {facts.length} data points · updates every scan</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.72rem", color: "var(--muted)", alignItems: "center" }}>
          <span><span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", marginRight: "4px", verticalAlign: "middle" }} />Confirmed (&gt;85%)</span>
          <span><span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#fbbf24", marginRight: "4px", verticalAlign: "middle" }} />Uncertain (60–85%)</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(255,255,255,0.025)", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th style={{ ...headerCellStyle, textAlign: "left", minWidth: "140px" }}>Family Member</th>
              {activeGroups.map((g) => (
                <th key={g.id} style={{ ...headerCellStyle, textAlign: "left", minWidth: "180px" }}>{g.icon} {g.label}</th>
              ))}
              <th style={{ ...headerCellStyle, textAlign: "center", minWidth: "70px" }}>📅 Soon</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const memberFacts = visibleFacts.filter(
                (f) => f.subject.toLowerCase() === member.subjectKey.toLowerCase()
              )
              const gradeFactObj = memberFacts.find((f) => f.predicate === "current_grade")?.object
              const upcoming = upcomingFor(member.name, member.isParent)

              return (
                <tr key={member.name}>
                  <td style={{ ...cellStyle, fontWeight: 700, color: member.isParent ? "#818cf8" : member.subjectKey === "family" ? "#34d399" : "#f472b6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{member.icon}</span>
                      <div>
                        <div>{member.name}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 400 }}>
                          {member.isParent ? "Parent" : member.subjectKey === "family" ? "Shared" : gradeFactObj ? gradeFactObj : "Child"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {activeGroups.map((group) => {
                    const groupFacts = memberFacts.filter((f) => group.predicates.includes(f.predicate))
                    return (
                      <td key={group.id} style={cellStyle}>
                        {groupFacts.length === 0
                          ? <span style={{ color: "var(--muted)", opacity: 0.35, fontSize: "0.75rem" }}>—</span>
                          : <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                              {groupFacts.map((f) => (
                                <div key={f.id}>
                                  {groupFacts.length > 1 && (
                                    <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginBottom: "0.1rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                      {PREDICATE_META[f.predicate]?.label}
                                    </div>
                                  )}
                                  <FactTag fact={f} onDelete={onDeleteFact} onUpdate={onUpdateFact} />
                                </div>
                              ))}
                            </div>
                        }
                      </td>
                    )
                  })}
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    {upcoming > 0
                      ? <span style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>{upcoming}</span>
                      : <span style={{ color: "var(--muted)", opacity: 0.35, fontSize: "0.75rem" }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Conflicted facts — shown separately so nothing is silently hidden */}
      {conflicted.length > 0 && (
        <div style={{ marginTop: "1.5rem", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "12px", padding: "1rem" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f87171", marginBottom: "0.75rem" }}>⚠ Conflicted facts — grade or age inconsistency detected</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {conflicted.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--muted)" }}>{f.subject}</span>
                <span style={{ color: "var(--muted)", opacity: 0.5 }}>→</span>
                <span style={{ color: "var(--muted)" }}>{PREDICATE_META[f.predicate]?.label ?? f.predicate}</span>
                <span style={{ color: "var(--muted)", opacity: 0.5 }}>→</span>
                <span style={{ color: "#f87171" }}>{f.object}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", opacity: 0.6 }}>({Math.round(f.confidence * 100)}% conf · {f.evidence_count} email{f.evidence_count !== 1 ? "s" : ""})</span>
                <button onClick={() => onDeleteFact(f.id)} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge graph stats */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {[
          { label: "Total facts", value: facts.length, color: "#818cf8" },
          { label: "Confirmed", value: facts.filter((f) => f.status === "confirmed").length, color: "#34d399" },
          { label: "Uncertain", value: facts.filter((f) => f.status === "uncertain").length, color: "#fbbf24" },
          { label: "Conflicted", value: conflicted.length, color: "#f87171" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.5rem 1rem", textAlign: "center", minWidth: "80px" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{label}</div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ["Food & Dining","Groceries","Transport","School","Activities","Medical","Utilities","Entertainment","Subscriptions","Shopping","Other"]

function ExpenseCard({ e, color, onDelete }: { e: ExpenseRow; color: string; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
      <div onClick={() => setExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", cursor: "pointer" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{e.title}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.1rem" }}>
            📅 {e.expense_date} · <span style={{ color }}>{e.category ?? "Other"}</span>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f87171", flexShrink: 0 }}>${Number(e.amount).toFixed(2)}</div>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.4, marginLeft: "0.25rem" }}>{expanded ? "▲" : "▼"}</span>
        <button onClick={(ev) => { ev.stopPropagation(); onDelete(e.id) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1 }}>×</button>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "0.625rem 1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", background: "rgba(255,255,255,0.02)" }}>
          <span>📅 <strong style={{ color: "var(--text)" }}>{e.expense_date}</strong></span>
          <span>💵 <strong style={{ color: "#f87171" }}>${Number(e.amount).toFixed(2)}</strong></span>
          <span style={{ color }}>📂 {e.category ?? "Other"}</span>
          {e.notes && <span>📝 {e.notes}</span>}
        </div>
      )}
    </div>
  )
}

function EmailSubRow({ e }: { e: ScannedEventRow }) {
  const [expanded, setExpanded] = useState(false)
  const name = e.vendor ?? e.organization_name ?? e.title
  const dateStr = e.event_date ? String(e.event_date).slice(0, 10) : null
  const freq = e.recurrence === "monthly" ? "/mo" : e.recurrence === "annual" ? "/yr" : e.recurrence === "weekly" ? "/wk" : ""
  return (
    <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer", background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "0.625rem 1rem", transition: "background 0.12s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <span style={{ fontSize: "0.875rem" }}>{EVENT_TYPE_ICON[e.event_type] ?? "💳"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{name}</div>
          {dateStr && <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>{dateStr}</div>}
        </div>
        {e.amount != null && (
          <div style={{ fontWeight: 700, color: "#818cf8", fontSize: "0.9rem", flexShrink: 0 }}>
            ${Number(e.amount).toFixed(2)}{freq}
          </div>
        )}
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(99,102,241,0.12)", paddingTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            {dateStr && <span>📅 <strong style={{ color: "var(--text)" }}>{dateStr}</strong></span>}
            {e.amount != null && <span>💵 <strong style={{ color: "#818cf8" }}>${Number(e.amount).toFixed(2)}{freq}</strong></span>}
            <span>📂 <strong style={{ color: "var(--text)" }}>{EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}</strong></span>
          </div>
          {e.snippet && <p style={{ opacity: 0.75, lineHeight: 1.5 }}>{e.snippet.slice(0, 250)}</p>}
        </div>
      )}
    </div>
  )
}

function ExpensesTab({ scannedEvents }: { scannedEvents: ScannedEventRow[] }) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newCategory, setNewCategory] = useState("Other")
  const [newDate, setNewDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/expenses").then(r => r.json()).then(d => { setExpenses(d.expenses ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function addExpense() {
    if (!newTitle.trim() || !newAmount) return
    setSaving(true)
    const res = await fetch("/api/expenses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), amount: parseFloat(newAmount), category: newCategory, expense_date: newDate }),
    })
    if (res.ok) {
      const { expense } = await res.json()
      setExpenses(prev => [expense, ...prev])
      setNewTitle(""); setNewAmount(""); setNewCategory("Other"); setNewDate(todayStr()); setShowAdd(false)
    }
    setSaving(false)
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const today = todayStr()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]

  const todayTotal = expenses.filter(e => e.expense_date === today).reduce((s, e) => s + e.amount, 0)
  const weekTotal = expenses.filter(e => e.expense_date >= weekAgo).reduce((s, e) => s + e.amount, 0)
  const monthTotal = expenses.filter(e => e.expense_date >= monthAgo).reduce((s, e) => s + e.amount, 0)

  // Email-detected subscriptions/invoices as reference
  const emailSubs = scannedEvents.filter(e => e.event_type === "subscription" || e.event_type === "invoice" || e.event_type === "bill")
  const monthlyFromEmail = emailSubs.filter(e => e.recurrence === "monthly").reduce((s, e) => s + Number(e.amount ?? 0), 0)

  const catColor: Record<string, string> = {
    "Food & Dining": "#f472b6", "Groceries": "#34d399", "Transport": "#60a5fa",
    "School": "#818cf8", "Activities": "#fbbf24", "Medical": "#a78bfa",
    "Utilities": "#f87171", "Entertainment": "#fb923c", "Subscriptions": "#6ee7b7",
    "Shopping": "#e879f9", "Other": "#6b7280",
  }

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>💰 Expenses</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Auto-detected from email · scan receipts by photo</p>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setShowAdd(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(248,113,113,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>💰 Add Expense</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={fieldLabelStyle}>Description *</label>
                <input autoFocus placeholder="e.g. Groceries, Piano lesson fee…" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={fieldLabelStyle}>Amount ($) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Date *</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
              <button onClick={addExpense} disabled={saving || !newTitle.trim() || !newAmount} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !newTitle.trim() || !newAmount ? "rgba(248,113,113,0.3)" : "linear-gradient(135deg,#f87171,#ef4444)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {saving ? "Saving…" : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spending summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
        {[
          { label: "Today", value: todayTotal, icon: "☀️", color: "#34d399" },
          { label: "This Week", value: weekTotal, icon: "📅", color: "#60a5fa" },
          { label: "Last 30 Days", value: monthTotal, icon: "📊", color: "#818cf8" },
          ...(monthlyFromEmail > 0 ? [{ label: "Email Subs/mo", value: monthlyFromEmail, icon: "💳", color: "#fbbf24" }] : []),
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: `${color}0d`, border: `1px solid ${color}33`, borderRadius: "14px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>{icon}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color, fontFamily: "'Outfit',sans-serif" }}>${value.toFixed(2)}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.15rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Expense list */}
      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Loading…</p>
      ) : expenses.length === 0 && emailSubs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "16px", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💳</div>
          <p style={{ fontWeight: 600, marginBottom: "0.375rem", color: "var(--text)" }}>No expenses or financial emails detected yet</p>
          <p style={{ fontSize: "0.82rem", marginBottom: "1.25rem" }}>
            Add expenses manually above, or go to <strong style={{ color: "#fbbf24" }}>Insights → Scan Inbox</strong> to automatically detect invoices, receipts, and subscriptions from your Gmail.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--muted)", opacity: 0.7 }}>
            {["Amazon orders", "Apple receipts", "Netflix", "Rogers/Shaw bills", "Online invoices"].map(s => (
              <span key={s} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.2rem 0.5rem" }}>{s}</span>
            ))}
          </div>
        </div>
      ) : expenses.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {expenses.map(e => {
            const color = catColor[e.category ?? "Other"] ?? "#6b7280"
            return <ExpenseCard key={e.id} e={e} color={color} onDelete={deleteExpense} />
          })}
        </div>
      )}

      {/* Email-detected subscriptions */}
      {emailSubs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem", color: "#818cf8" }}>💳 Detected from Email</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {emailSubs.map(e => <EmailSubRow key={e.id} e={e} />)}
          </div>
        </div>
      )}
    </>
  )
}

// ── Manage Family Tab ─────────────────────────────────────────────────────────
const WORK_TYPES = [
  { value: "wfh", label: "Work from Home", icon: "🏠" },
  { value: "office", label: "Office", icon: "🏢" },
  { value: "hybrid", label: "Hybrid", icon: "🔀" },
]

// ── Address Search (Photon by Komoot) ────────────────────────────────────────
// Photon is built for prefix/autocomplete on OSM data — much better than Nominatim for CA/US
interface PhotonFeature {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    osm_id: number; osm_type: string; name?: string
    housenumber?: string; street?: string
    city?: string; town?: string; village?: string
    state?: string; county?: string
    postcode?: string; country?: string; countrycode?: string
  }
}

// North America bounding box used to bias/filter results to CA + US
const NA_BBOX = "-172.0,24.0,-52.0,72.0"

async function photonSearch(q: string): Promise<PhotonFeature[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en&bbox=${NA_BBOX}`
  const res = await fetch(url)
  const data: { features: PhotonFeature[] } = await res.json()
  // Keep only CA and US results
  return data.features.filter((f) => {
    const cc = f.properties.countrycode?.toUpperCase()
    return cc === "CA" || cc === "US"
  })
}

function parsePhoton(f: PhotonFeature) {
  const p = f.properties
  const street = [p.housenumber, p.street].filter(Boolean).join(" ")
  const city = p.city ?? p.town ?? p.village ?? ""
  const province = p.state ?? ""
  const postal = p.postcode ?? ""
  const cc = p.countrycode?.toUpperCase()
  const country = cc === "CA" ? "Canada" : cc === "US" ? "United States" : (p.country ?? "")
  const displayParts = [street || p.name, city, province, postal, country].filter(Boolean)
  return { street: street || p.name || "", city, province, postal, country, display: displayParts.join(", ") }
}

// simpleMode=true → selecting fills the input with "street, city, province, postal" and calls onSelectSimple
function AddressSearch({ value, onChange, onSelect, onSelectSimple, placeholder, simpleMode }: {
  value: string
  onChange: (v: string) => void
  onSelect?: (parts: { street: string; city: string; province: string; postal: string; country: string }) => void
  onSelectSimple?: (full: string) => void
  placeholder?: string
  simpleMode?: boolean
}) {
  const [results, setResults] = useState<PhotonFeature[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(v: string) {
    onChange(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (v.trim().length < 3) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await photonSearch(v)
        setResults(data)
        setOpen(data.length > 0)
      } catch { setResults([]) } finally { setLoading(false) }
    }, 350)
  }

  function pick(f: PhotonFeature) {
    const parts = parsePhoton(f)
    if (simpleMode) {
      const full = [parts.street, parts.city, parts.province, parts.postal].filter(Boolean).join(", ")
      onChange(full)
      onSelectSimple?.(full)
    } else {
      onSelect?.(parts)
      onChange(parts.street)
    }
    setOpen(false)
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={value} onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder ?? "Start typing address…"}
          style={{ ...inputSt }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          autoComplete="off"
        />
        {loading && <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: "var(--muted)" }}>searching…</span>}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
          {results.map((f, i) => (
            <button key={`${f.properties.osm_id}-${i}`} onMouseDown={() => pick(f)} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", color: "var(--text)", fontSize: "0.78rem", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter',sans-serif", lineHeight: 1.4 }}>
              <span style={{ fontSize: "0.7rem" }}>📍 </span>{parsePhoton(f).display}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PET_TYPES = [
  { value: "dog", label: "Dog", icon: "🐕" },
  { value: "cat", label: "Cat", icon: "🐈" },
  { value: "rabbit", label: "Rabbit", icon: "🐇" },
  { value: "bird", label: "Bird", icon: "🐦" },
  { value: "fish", label: "Fish", icon: "🐠" },
  { value: "hamster", label: "Hamster", icon: "🐹" },
  { value: "other", label: "Other", icon: "🐾" },
]

function SettingsTab({ profile: initialProfile, kids, setKids, pets, setPets }: {
  profile: ProfileData; kids: KidRow[]; setKids: (k: KidRow[]) => void
  pets: PetRow[]; setPets: (p: PetRow[]) => void
}) {
  const [draft, setDraft] = useState({
    firstName: initialProfile.firstName, lastName: initialProfile.lastName,
    phone: initialProfile.phone, familyType: initialProfile.familyType,
    city: initialProfile.city, timezone: initialProfile.timezone,
    addressStreet: initialProfile.addressStreet, addressProvince: initialProfile.addressProvince,
    addressPostal: initialProfile.addressPostal, addressCountry: initialProfile.addressCountry,
    workType: initialProfile.workType, workAddress: initialProfile.workAddress,
    spouseFirstName: initialProfile.spouseFirstName, spouseLastName: initialProfile.spouseLastName,
    spousePhone: initialProfile.spousePhone, spouseEmail: initialProfile.spouseEmail,
    spouseWorkType: initialProfile.spouseWorkType, spouseWorkAddress: initialProfile.spouseWorkAddress,
  })
  type EditKid = { id: string; firstName: string; lastName: string; dob: string; schoolName: string; grade: string; daycareName: string; daycareAddress: string }
  type EditPet = { id: string; name: string; animalType: string; breed: string; dob: string }
  const [editKids, setEditKids] = useState<EditKid[]>(kids.map((k) => ({ id: k.id, firstName: k.firstName ?? "", lastName: k.lastName ?? "", dob: k.dob ?? "", schoolName: k.schoolName ?? "", grade: k.grade ?? "", daycareName: k.daycareName ?? "", daycareAddress: k.daycareAddress ?? "" })))
  const [editPets, setEditPets] = useState<EditPet[]>(pets.map((p) => ({ id: p.id, name: p.name, animalType: p.animalType, breed: p.breed ?? "", dob: p.dob ?? "" })))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const hasSpouse = draft.familyType !== "single_parent"
  function sf<K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) { setDraft((p) => ({ ...p, [key]: val })) }
  function sk(i: number, key: keyof EditKid, val: string) { setEditKids((prev) => prev.map((k, idx) => idx === i ? { ...k, [key]: val } : k)) }
  function sp(i: number, key: keyof EditPet, val: string) { setEditPets((prev) => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p)) }

  async function saveAll() {
    if (!draft.city.trim() || !draft.timezone) return
    setSaving(true)
    const validKids = editKids.filter((k) => k.firstName.trim() || k.lastName.trim())
    const validPets = editPets.filter((p) => p.name.trim() && p.animalType)
    await Promise.all([
      fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: draft.firstName || null, last_name: draft.lastName || null,
          phone: draft.phone || null, family_type: draft.familyType || null,
          city: draft.city || null, timezone: draft.timezone || null,
          address_street: draft.addressStreet || null, address_province: draft.addressProvince || null,
          address_postal: draft.addressPostal || null, address_country: draft.addressCountry || null,
          work_type: draft.workType || null, work_address: draft.workAddress || null,
          spouse_first_name: draft.spouseFirstName || null, spouse_last_name: draft.spouseLastName || null,
          spouse_phone: draft.spousePhone || null, spouse_email: draft.spouseEmail || null,
          spouse_work_type: draft.spouseWorkType || null, spouse_work_address: draft.spouseWorkAddress || null,
        }),
      }),
      fetch("/api/kids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kids: validKids.map((k) => ({ first_name: k.firstName.trim(), last_name: k.lastName.trim(), dob: k.dob || null, school_name: k.schoolName.trim() || null, grade: k.grade.trim() || null, daycare_name: k.daycareName.trim() || null, daycare_address: k.daycareAddress.trim() || null })) }),
      }),
      fetch("/api/migrate", { method: "POST" }).catch(() => {}),
      fetch("/api/pets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pets: validPets.map((p) => ({ name: p.name.trim(), animal_type: p.animalType, breed: p.breed.trim() || null, dob: p.dob || null })) }),
      }).catch(() => {}),
    ])
    setKids(validKids.map((k) => ({ id: k.id, name: [k.firstName, k.lastName].filter(Boolean).join(" "), firstName: k.firstName || null, lastName: k.lastName || null, dob: k.dob || null, schoolName: k.schoolName || null, grade: k.grade || null, daycareName: k.daycareName || null, daycareAddress: k.daycareAddress || null })))
    setPets(validPets.map((p) => ({ id: p.id, name: p.name, animalType: p.animalType, breed: p.breed || null, dob: p.dob || null })))
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  // Family tree helper
  const parentName = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || "You"
  const spouseName = [draft.spouseFirstName, draft.spouseLastName].filter(Boolean).join(" ") || "Partner"

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Manage Family</h2>
        <button onClick={saveAll} disabled={saving || !draft.city.trim() || !draft.timezone} style={{ ...savePillStyle, padding: "0.65rem 1.75rem", fontSize: "0.875rem", background: saved ? "linear-gradient(135deg,#4ade80,#22c55e)" : saving ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ── Family Tree ──────────────────────────────────────────────────────── */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.75rem", overflow: "hidden" }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5rem" }}>Family Tree</h3>

          {/* Parents row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", marginBottom: hasSpouse || editKids.length > 0 ? "0" : "0" }}>
            <FamilyTreeCard name={parentName} subtitle={draft.workType ? WORK_TYPES.find((w) => w.value === draft.workType)?.label ?? "Parent" : "Parent"} color="#818cf8" icon="👤" />
            {hasSpouse && <><div style={{ display: "flex", alignItems: "center", color: "var(--muted)", fontSize: "1.2rem", alignSelf: "center" }}>❤️</div><FamilyTreeCard name={spouseName} subtitle="Partner" color="#f472b6" icon="👤" /></>}
          </div>

          {/* Connector line */}
          {editKids.filter((k) => k.firstName || k.lastName).length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", margin: "0.75rem 0" }}>
              <div style={{ width: "2px", height: "28px", background: "linear-gradient(180deg,rgba(129,140,248,0.5),rgba(244,114,182,0.5))" }} />
            </div>
          )}

          {/* Kids row */}
          {editKids.filter((k) => k.firstName || k.lastName).length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              {editKids.filter((k) => k.firstName || k.lastName).map((k, i) => (
                <FamilyTreeCard key={i} name={[k.firstName, k.lastName].filter(Boolean).join(" ")} subtitle={k.grade ? k.grade : k.schoolName ? k.schoolName : "Child"} color={memberColor(i + 1)} icon="👧" />
              ))}
            </div>
          )}

          {/* Pets row */}
          {editPets.filter((p) => p.name).length > 0 && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pets</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                {editPets.filter((p) => p.name).map((p, i) => {
                  const pt = PET_TYPES.find((t) => t.value === p.animalType)
                  return <FamilyTreeCard key={i} name={p.name} subtitle={[pt?.label, p.breed].filter(Boolean).join(" · ")} color="#fbbf24" icon={pt?.icon ?? "🐾"} />
                })}
              </div>
            </div>
          )}
        </div>

        {/* 1 — Family Type */}
        <SettingsSection title="Family Type" icon="👨‍👩‍👧‍👦" accent="#60a5fa" bg="rgba(96,165,250,0.07)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
            {FAMILY_TYPE_OPTIONS.map((opt) => {
              const active = draft.familyType === opt.value
              return (
                <button key={opt.value} onClick={() => sf("familyType", opt.value)} style={{ textAlign: "left", padding: "0.875rem", borderRadius: "12px", cursor: "pointer", background: active ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.03)", border: active ? "1.5px solid rgba(96,165,250,0.6)" : "1px solid var(--border)", transition: "all 0.15s" }}>
                  <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{opt.icon}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: active ? "#60a5fa" : "var(--text)" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem", lineHeight: 1.4 }}>{opt.description}</div>
                </button>
              )
            })}
          </div>
        </SettingsSection>

        {/* 2 — Personal Info + Spouse side by side */}
        <div style={{ display: "grid", gridTemplateColumns: hasSpouse ? "1fr 1fr" : "1fr", gap: "1rem" }}>
          <SettingsSection title="Your Information" icon="👤" accent="#818cf8" bg="rgba(99,102,241,0.07)">
            <div style={fieldRowStyle}>
              <label style={fieldLabelStyle}>Email</label>
              <div style={{ ...inputSt, color: "var(--muted)", background: "rgba(255,255,255,0.02)", cursor: "not-allowed" }}>{initialProfile.email}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              <div><label style={fieldLabelStyle}>First Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.firstName} onChange={(e) => sf("firstName", e.target.value)} placeholder="First name" /></div>
              <div><label style={fieldLabelStyle}>Last Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.lastName} onChange={(e) => sf("lastName", e.target.value)} placeholder="Last name" /></div>
            </div>
            <div style={fieldRowStyle}><label style={fieldLabelStyle}>Phone</label><input type="tel" style={inputSt} value={draft.phone} onChange={(e) => sf("phone", e.target.value)} placeholder="+1 (555) 000-0000" /></div>
            <div style={fieldRowStyle}>
              <label style={fieldLabelStyle}>Work Type</label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {WORK_TYPES.map((w) => <button key={w.value} onClick={() => sf("workType", w.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${draft.workType === w.value ? "#818cf8" : "rgba(255,255,255,0.1)"}`, background: draft.workType === w.value ? "rgba(129,140,248,0.18)" : "none", color: draft.workType === w.value ? "#818cf8" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{w.icon} {w.label}</button>)}
              </div>
            </div>
            {draft.workType && draft.workType !== "wfh" && (
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>Work Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
                <AddressSearch simpleMode value={draft.workAddress} onChange={(v) => sf("workAddress", v)} onSelectSimple={(v) => sf("workAddress", v)} placeholder="Search office address…" />
              </div>
            )}
          </SettingsSection>

          {hasSpouse && (
            <SettingsSection title="Spouse / Partner" icon="💑" accent="#f472b6" bg="rgba(244,114,182,0.07)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div><label style={fieldLabelStyle}>First Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.spouseFirstName} onChange={(e) => sf("spouseFirstName", e.target.value)} placeholder="First name" /></div>
                <div><label style={fieldLabelStyle}>Last Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.spouseLastName} onChange={(e) => sf("spouseLastName", e.target.value)} placeholder="Last name" /></div>
              </div>
              <div style={fieldRowStyle}><label style={fieldLabelStyle}>Phone</label><input type="tel" style={inputSt} value={draft.spousePhone} onChange={(e) => sf("spousePhone", e.target.value)} placeholder="+1 (555) 000-0000" /></div>
              <div style={fieldRowStyle}><label style={fieldLabelStyle}>Email</label><input type="email" style={inputSt} value={draft.spouseEmail} onChange={(e) => sf("spouseEmail", e.target.value)} placeholder="spouse@email.com" /></div>
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>Work Type</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {WORK_TYPES.map((w) => <button key={w.value} onClick={() => sf("spouseWorkType", w.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${draft.spouseWorkType === w.value ? "#f472b6" : "rgba(255,255,255,0.1)"}`, background: draft.spouseWorkType === w.value ? "rgba(244,114,182,0.18)" : "none", color: draft.spouseWorkType === w.value ? "#f472b6" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{w.icon} {w.label}</button>)}
                </div>
              </div>
              {draft.spouseWorkType && draft.spouseWorkType !== "wfh" && (
                <div style={fieldRowStyle}>
                  <label style={fieldLabelStyle}>Work Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
                  <AddressSearch simpleMode value={draft.spouseWorkAddress} onChange={(v) => sf("spouseWorkAddress", v)} onSelectSimple={(v) => sf("spouseWorkAddress", v)} placeholder="Search office address…" />
                </div>
              )}
            </SettingsSection>
          )}
        </div>

        {/* 3 — Home Location */}
        <SettingsSection title="Home Location" icon="📍" accent="#34d399" bg="rgba(52,211,153,0.07)">
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Street Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
            <AddressSearch
              value={draft.addressStreet}
              onChange={(v) => sf("addressStreet", v)}
              onSelect={({ street, city, province, postal, country }) => {
                sf("addressStreet", street)
                if (city) sf("city", city)
                if (province) sf("addressProvince", province)
                if (postal) sf("addressPostal", postal)
                if (country) sf("addressCountry", country)
              }}
              placeholder="123 Main St, Calgary…"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
            <div><label style={fieldLabelStyle}>City <span style={{ color: "#f87171" }}>*</span></label><input style={{ ...inputSt, marginTop: "0.25rem", borderColor: !draft.city.trim() ? "rgba(248,113,113,0.5)" : undefined }} value={draft.city} onChange={(e) => sf("city", e.target.value)} placeholder="City" /></div>
            <div><label style={fieldLabelStyle}>Province / State</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.addressProvince} onChange={(e) => sf("addressProvince", e.target.value)} placeholder="AB" /></div>
            <div><label style={fieldLabelStyle}>Postal / ZIP</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.addressPostal} onChange={(e) => sf("addressPostal", e.target.value)} placeholder="T2Z 0G5" /></div>
          </div>
          <div style={fieldRowStyle}><label style={fieldLabelStyle}>Country</label><input style={inputSt} value={draft.addressCountry} onChange={(e) => sf("addressCountry", e.target.value)} placeholder="Canada" /></div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Timezone <span style={{ color: "#f87171" }}>*</span></label>
            <select value={draft.timezone} onChange={(e) => sf("timezone", e.target.value)} style={{ ...inputSt, cursor: "pointer", appearance: "none", borderColor: !draft.timezone ? "rgba(248,113,113,0.5)" : undefined }}>
              <option value="">Select timezone</option>
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
        </SettingsSection>

        {/* 4 — Kids */}
        <SettingsSection title="Children" icon="👧" accent="#f472b6" bg="rgba(244,114,182,0.07)">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {editKids.map((kid, i) => (
              <div key={i} style={{ background: `${memberColor(i + 1)}08`, border: `1px solid ${memberColor(i + 1)}25`, borderRadius: "14px", padding: "1.25rem", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: memberColor(i + 1), textTransform: "uppercase", letterSpacing: "0.05em" }}>Child {i + 1}</span>
                  <button onClick={() => setEditKids((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Remove</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div><label style={fieldLabelStyle}>First Name</label><input value={kid.firstName} placeholder="First name" onChange={(e) => sk(i, "firstName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Last Name</label><input value={kid.lastName} placeholder="Last name" onChange={(e) => sk(i, "lastName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Date of Birth</label><input type="date" value={kid.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => sk(i, "dob", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div><label style={fieldLabelStyle}>School Name</label><input value={kid.schoolName} placeholder="e.g. Fairview School" onChange={(e) => sk(i, "schoolName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Grade / Year</label><input value={kid.grade} placeholder="e.g. Grade 6" onChange={(e) => sk(i, "grade", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  <div><label style={fieldLabelStyle}>Daycare / Nursery</label><input value={kid.daycareName} placeholder="Name (optional)" onChange={(e) => sk(i, "daycareName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div>
                    <label style={fieldLabelStyle}>Daycare Address</label>
                    <AddressSearch simpleMode value={kid.daycareAddress} onChange={(v) => sk(i, "daycareAddress", v)} onSelectSimple={(v) => sk(i, "daycareAddress", v)} placeholder="Search address…" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setEditKids((prev) => [...prev, { id: "", firstName: "", lastName: "", dob: "", schoolName: "", grade: "", daycareName: "", daycareAddress: "" }])} style={{ background: "none", border: "2px dashed rgba(244,114,182,0.3)", borderRadius: "12px", padding: "0.75rem", color: "#f472b6", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", width: "100%" }}>+ Add Child</button>
          </div>
        </SettingsSection>

        {/* 5 — Pets */}
        <SettingsSection title="Pets" icon="🐾" accent="#fbbf24" bg="rgba(251,191,36,0.06)">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {editPets.map((pet, i) => (
              <div key={i} style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "14px", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>{PET_TYPES.find((t) => t.value === pet.animalType)?.icon ?? "🐾"} Pet {i + 1}</span>
                  <button onClick={() => setEditPets((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Remove</button>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {PET_TYPES.map((t) => <button key={t.value} onClick={() => sp(i, "animalType", t.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${pet.animalType === t.value ? "#fbbf24" : "rgba(255,255,255,0.1)"}`, background: pet.animalType === t.value ? "rgba(251,191,36,0.15)" : "none", color: pet.animalType === t.value ? "#fbbf24" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{t.icon} {t.label}</button>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
                  <div><label style={fieldLabelStyle}>Name</label><input value={pet.name} placeholder="Pet's name" onChange={(e) => sp(i, "name", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Breed (optional)</label><input value={pet.breed} placeholder="e.g. Labrador" onChange={(e) => sp(i, "breed", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Date of Birth</label><input type="date" value={pet.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => sp(i, "dob", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setEditPets((prev) => [...prev, { id: "", name: "", animalType: "dog", breed: "", dob: "" }])} style={{ background: "none", border: "2px dashed rgba(251,191,36,0.3)", borderRadius: "12px", padding: "0.75rem", color: "#fbbf24", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", width: "100%" }}>+ Add Pet</button>
          </div>
        </SettingsSection>

      </div>
    </>
  )
}

function FamilyTreeCard({ name, subtitle, color, icon }: { name: string; subtitle: string; color: string; icon: string }) {
  return (
    <div style={{ background: `${color}12`, border: `1.5px solid ${color}35`, borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "center", minWidth: "110px", maxWidth: "160px" }}>
      <div style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", color, marginBottom: "0.2rem", lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--muted)", lineHeight: 1.4 }}>{subtitle || "—"}</div>
    </div>
  )
}

// ── Shared small components ───────────────────────────────────────────────────
function SectionHeader({ title, accent, onAdd }: { title: string; accent: string; onAdd?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</h3>
      {onAdd && <button onClick={onAdd} style={{ background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: "8px", padding: "0.3rem 0.75rem", color: accent, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>+ Add</button>}
    </div>
  )
}

function SettingsSection({ title, icon, children, accent, bg }: { title: string; icon: string; children: React.ReactNode; accent?: string; bg?: string }) {
  return (
    <div style={{ background: bg ?? "rgba(255,255,255,0.025)", border: `1px solid ${accent ? accent + "30" : "var(--border)"}`, borderRadius: "16px", padding: "1.5rem" }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: accent ?? "var(--text)" }}>
        <span>{icon}</span>{title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{children}</div>
    </div>
  )
}

function InlineForm({ onCancel, onSave, saving, disabled, children }: { onCancel: () => void; onSave: () => void; saving: boolean; disabled: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "12px", padding: "1rem", marginBottom: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {children}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
        <button onClick={onSave} disabled={saving || disabled} style={{ flex: 2, padding: "0.5rem", borderRadius: "8px", background: saving || disabled ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.8rem", fontWeight: 600, cursor: saving || disabled ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>{saving ? "Saving…" : "Add"}</button>
      </div>
    </div>
  )
}

function ScannedEventBlock({ ev, color }: { ev: ScannedEventRow; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const timeStr = ev.start_time ? fmtTime(ev.start_time) : ""
  return (
    <div onClick={() => setExpanded((v) => !v)} style={{ cursor: "pointer", padding: "0.625rem 0.875rem", background: `${color}10`, borderRadius: "10px", border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {timeStr && <span style={{ fontSize: "0.72rem", color, fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{timeStr}</span>}
        <span style={{ flex: 1, fontSize: "0.875rem" }}>{ev.calendar_title ?? ev.title}</span>
        {ev.kid_name && (
          <span style={{ fontSize: "0.62rem", color, background: `${color}22`, borderRadius: "10px", padding: "0.1rem 0.45rem", fontWeight: 700, flexShrink: 0 }}>{ev.kid_name.split(" ")[0]}</span>
        )}
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", opacity: 0.5 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)", borderTop: `1px solid ${color}22`, paddingTop: "0.5rem" }}>
          {ev.special_instructions && <p style={{ color: "#fbbf24", marginBottom: "0.25rem" }}>📌 {ev.special_instructions}</p>}
          {ev.snippet && <p style={{ opacity: 0.8, lineHeight: 1.5 }}>{ev.snippet.slice(0, 200)}</p>}
          <p style={{ marginTop: "0.25rem", opacity: 0.5, fontSize: "0.68rem" }}>{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type} · {ev.organization_name ?? ev.source_from.split("@")[1] ?? ""}</p>
        </div>
      )}
    </div>
  )
}

function GCalEventRow({ event, onClick }: { event: GCalEvent; onClick: () => void }) {
  const timeStr = event.allDay ? "All day" : event.start ? fmtTime(event.start.split("T")[1]?.slice(0, 5) ?? "") : ""
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(99,102,241,0.08)", borderRadius: "10px", border: "1px solid rgba(99,102,241,0.22)", cursor: "pointer" }}>
      <span style={{ fontSize: "0.85rem" }}>📅</span>
      {timeStr && <span style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{timeStr}</span>}
      <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
      <span style={{ fontSize: "0.65rem", color: "#818cf8", background: "rgba(99,102,241,0.15)", borderRadius: "6px", padding: "0.1rem 0.4rem", flexShrink: 0 }}>Google ›</span>
    </div>
  )
}

function EventRow({ event, onDelete, onUpdate, kids }: {
  event: Event
  onDelete: (id: string) => void
  onUpdate?: (id: string, data: Partial<Event>) => void
  kids?: KidRow[]
}) {
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: event.title, event_date: event.event_date, start_time: event.start_time ?? "", end_time: event.end_time ?? "", member_name: event.member_name ?? "" })
  const [saving, setSaving] = useState(false)
  const isIcs = event.source === "ics_import"
  const mc = event.member_name && kids
    ? (() => { const i = kids.findIndex((k) => k.name === event.member_name); return i >= 0 ? memberColor(i + 1) : "#818cf8" })()
    : "#34d399"

  const SOURCE_LABEL: Record<string, string> = { manual: "Added manually", ics_import: "Imported from ICS file", gcal: "Google Calendar", email: "Email scan" }

  async function save() {
    if (!draft.title.trim() || !draft.event_date) return
    setSaving(true)
    await onUpdate?.(event.id, { title: draft.title.trim(), event_date: draft.event_date, start_time: draft.start_time || null, end_time: draft.end_time || null, member_name: draft.member_name || null })
    setSaving(false); setEditing(false)
  }

  async function handleDelete() {
    setShowDetail(false)
    onDelete(event.id)
  }

  return (
    <>
      {/* Detail / Edit Modal */}
      {showDetail && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => { setShowDetail(false); setEditing(false) }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "480px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>📅 Event Details</h3>
              <button onClick={() => { setShowDetail(false); setEditing(false) }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {!editing ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div>
                    <div style={fieldLabelStyle}>Title</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "0.2rem" }}>{event.title}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <div style={fieldLabelStyle}>Date</div>
                      <div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>{event.event_date}</div>
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Time</div>
                      <div style={{ fontSize: "0.875rem", marginTop: "0.2rem" }}>
                        {event.start_time ? fmtTime(event.start_time) : "—"}
                        {event.end_time ? ` → ${fmtTime(event.end_time)}` : ""}
                      </div>
                    </div>
                  </div>
                  {event.member_name && (
                    <div>
                      <div style={fieldLabelStyle}>Family Member</div>
                      <span style={{ display: "inline-block", marginTop: "0.2rem", fontSize: "0.78rem", color: mc, background: `${mc}20`, borderRadius: "10px", padding: "0.2rem 0.6rem", fontWeight: 700 }}>{event.member_name}</span>
                    </div>
                  )}
                  <div>
                    <div style={fieldLabelStyle}>Source</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>{SOURCE_LABEL[event.source] ?? event.source}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={handleDelete} style={{ padding: "0.65rem 1rem", borderRadius: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Delete</button>
                  {onUpdate && <button onClick={() => setEditing(true)} style={{ flex: 1, padding: "0.65rem 1rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Edit Event</button>}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div>
                    <label style={fieldLabelStyle}>Title</label>
                    <input autoFocus value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem" }} placeholder="Event title" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div>
                      <label style={fieldLabelStyle}>Date</label>
                      <input type="date" value={draft.event_date} onChange={(e) => setDraft((d) => ({ ...d, event_date: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} />
                    </div>
                    <div>
                      <label style={fieldLabelStyle}>Start Time</label>
                      <input type="time" value={draft.start_time} onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div>
                      <label style={fieldLabelStyle}>End Time</label>
                      <input type="time" value={draft.end_time} onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} />
                    </div>
                    {kids && kids.length > 0 && (
                      <div>
                        <label style={fieldLabelStyle}>Member</label>
                        <select value={draft.member_name} onChange={(e) => setDraft((d) => ({ ...d, member_name: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}>
                          <option value="">Family</option>
                          {kids.map((k) => <option key={k.id} value={k.name}>{k.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => setEditing(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "10px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                  <button onClick={save} disabled={saving || !draft.title.trim() || !draft.event_date} style={{ flex: 2, padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{saving ? "Saving…" : "Save Changes"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Row */}
      <div onClick={() => { setShowDetail(true); setEditing(false) }} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: isIcs ? "rgba(129,140,248,0.04)" : "rgba(255,255,255,0.03)", borderRadius: "10px", border: `1px solid ${isIcs ? "rgba(129,140,248,0.2)" : "var(--border)"}`, cursor: "pointer" }}>
        {event.start_time && <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{fmtTime(event.start_time)}</span>}
        <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
        {event.member_name && <span style={{ fontSize: "0.62rem", color: mc, background: `${mc}20`, borderRadius: "10px", padding: "0.1rem 0.45rem", fontWeight: 700, flexShrink: 0 }}>{event.member_name.split(" ")[0]}</span>}
        {isIcs && <span style={{ fontSize: "0.6rem", color: "#818cf8", opacity: 0.6, flexShrink: 0 }}>ics</span>}
        <span style={{ fontSize: "0.75rem", color: "var(--muted)", flexShrink: 0 }}>›</span>
      </div>
    </>
  )
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, c: boolean) => void; onDelete: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--border)" }}>
      <button onClick={() => onToggle(task.id, !task.completed)} style={{ width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, border: task.completed ? "none" : "2px solid var(--border)", background: task.completed ? "linear-gradient(135deg,#6366f1,#c084fc)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {task.completed && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
      </button>
      <span style={{ flex: 1, fontSize: "0.875rem", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--muted)" : "var(--text)" }}>{task.title}</span>
      <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1 }}>×</button>
    </div>
  )
}

function FabOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: "rgba(16,14,36,0.98)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.5rem 1.25rem", color: "var(--text)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", backdropFilter: "blur(8px)", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
      {label}
    </button>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: "1.75rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border)" }}>{text}</div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sectionCard: React.CSSProperties = { background: "#FFFFFF", border: "none", borderRadius: "20px", padding: "1.375rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }
const inputSt: React.CSSProperties = { width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "rgba(60,60,67,0.06)", border: "1px solid rgba(60,60,67,0.1)", color: "var(--text)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }
const fieldRowStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.375rem" }
const fieldLabelStyle: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }
const savePillStyle: React.CSSProperties = { background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", flexShrink: 0 }
const navArrow: React.CSSProperties = { background: "#FFFFFF", border: "1px solid rgba(60,60,67,0.14)", borderRadius: "10px", padding: "0.35rem 0.875rem", color: "var(--text)", cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }
const fabStyle = (open: boolean): React.CSSProperties => ({ width: "54px", height: "54px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: open ? "1.8rem" : "1.6rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.55)", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 })
