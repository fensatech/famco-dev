"use client"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import { FAMILY_TYPE_OPTIONS, type FamilyType } from "@/types"
import type { Event, Task } from "@/lib/db"

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileData {
  firstName: string; lastName: string; email: string
  phone: string; city: string; timezone: string; familyType: FamilyType | null
  createdAt: string
}
interface KidRow { id: string; name: string; dob: string | null }
interface ScannedEventRow {
  id: string; title: string; event_date: string | null
  event_type: string; organization_name: string | null
  organization_type: string | null; source_from: string; snippet: string
}
interface Props {
  profile: ProfileData; kids: KidRow[]; provider: string
  todayEvents: Event[]; tasks: Task[]; scannedEvents: ScannedEventRow[]
}
type Tab = "home" | "calendar" | "tasks" | "insights" | "settings"
type CalView = "day" | "week" | "month"

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV: { id: Tab; label: string; icon: string; color: string; bg: string }[] = [
  { id: "home",     label: "Home",     icon: "🏠", color: "#818cf8", bg: "rgba(99,102,241,0.18)" },
  { id: "calendar", label: "Calendar", icon: "📅", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  { id: "tasks",    label: "Tasks",    icon: "✅", color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
  { id: "insights", label: "Insights", icon: "💡", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  { id: "settings", label: "Settings", icon: "⚙️", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
]

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
  calendar_invite: "📆", appointment: "🏥", school_event: "🏫", medical: "💊", other: "📧",
}
const ORG_TYPE_COLOR: Record<string, string> = {
  school: "#34d399", medical_clinic: "#60a5fa", dental: "#a78bfa",
  sports: "#f472b6", pharmacy: "#fbbf24",
}

// ── Root component ────────────────────────────────────────────────────────────
export function DashboardShell({ profile: initialProfile, kids: initialKids, provider, todayEvents: initialEvents, tasks: initialTasks, scannedEvents: initialScannedEvents }: Props) {
  const [tab, setTab] = useState<Tab>("home")
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [kids, setKids] = useState<KidRow[]>(initialKids)
  const [scannedEvents, setScannedEvents] = useState<ScannedEventRow[]>(initialScannedEvents)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState("")
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
      const r = await fetch("/api/insights")
      if (r.ok) {
        const { events } = await r.json()
        setScannedEvents(events)
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
      body: JSON.stringify({ title: newEventTitle.trim(), event_date: todayStr(), start_time: newEventTime || null }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setEvents((prev) => [...prev, event].sort((a, b) => (a.start_time ?? "99:99") < (b.start_time ?? "99:99") ? -1 : 1))
      setNewEventTitle(""); setNewEventTime(""); setShowAddEvent(false)
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
        background: "rgba(8,6,18,0.95)", backdropFilter: "blur(12px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2rem", padding: "0 0.5rem" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#6366f1,#c084fc)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🏠</div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "1.1rem" }}>Famco</span>
        </div>

        {/* Nav items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
          {NAV.map(({ id, label, icon, color, bg }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.75rem 1rem", borderRadius: "12px", border: "none",
                background: active ? bg : "transparent",
                color: active ? color : "var(--muted)",
                fontSize: "0.9rem", fontWeight: active ? 700 : 400,
                cursor: "pointer", fontFamily: "'Inter',sans-serif",
                transition: "all 0.15s", textAlign: "left", width: "100%",
                boxShadow: active ? `0 0 0 1px ${color}30` : "none",
              }}>
                <span style={{ fontSize: "1.15rem", width: "24px", textAlign: "center", flexShrink: 0 }}>{icon}</span>
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
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.65rem 1rem", borderRadius: "10px", border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.1)", color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", marginTop: "1rem", width: "100%", transition: "background 0.15s" }}>
          <span>↪</span> Sign out
        </button>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <header style={{ padding: "1rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,8,20,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 20 }}>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "'Outfit',sans-serif", color: activeNav.color }}>{activeNav.icon} {activeNav.label}</h1>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{todayLabel()}</span>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", paddingBottom: isMobile ? "5.5rem" : "5rem", overflowY: "auto" }}>

          {tab === "home" && (
            <HomeTab
              firstName={initialProfile.firstName}
              events={events} pendingTasks={pending}
              showAddEvent={showAddEvent} setShowAddEvent={setShowAddEvent}
              newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle}
              newEventTime={newEventTime} setNewEventTime={setNewEventTime}
              onAddEvent={addEvent}
              showAddTask={showAddTask} setShowAddTask={setShowAddTask}
              newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle}
              onAddTask={addTask}
              onToggleTask={toggleTask} onDeleteTask={deleteTask} onDeleteEvent={deleteEvent}
              saving={saving} kidsCount={kids.length} totalTasks={tasks.length}
            />
          )}
          {tab === "calendar" && (
            <CalendarTab events={events} onDeleteEvent={deleteEvent}
              showAddEvent={showAddEvent} setShowAddEvent={setShowAddEvent}
              newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle}
              newEventTime={newEventTime} setNewEventTime={setNewEventTime}
              onAddEvent={addEvent} saving={saving} provider={provider}
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
            <InsightsTab scannedEvents={scannedEvents} signedUpAt={initialProfile.createdAt} provider={provider} onRefresh={refreshInsights} />
          )}
          {tab === "settings" && (
            <SettingsTab profile={initialProfile} kids={kids} setKids={setKids} />
          )}
        </main>
      </div>

      {/* FAB (hidden on mobile) */}
      {!isMobile && (
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
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "64px", background: "rgba(8,6,18,0.98)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-around", zIndex: 100, backdropFilter: "blur(12px)" }}>
          {NAV.map(({ id, label, icon, color, bg }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem", background: active ? bg : "transparent", border: "none", cursor: "pointer", padding: "0.4rem 0.625rem", borderRadius: "10px", color: active ? color : "var(--muted)", fontSize: "0.58rem", fontWeight: active ? 700 : 400, fontFamily: "'Inter',sans-serif", position: "relative", minWidth: "52px" }}>
                <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{icon}</span>
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

// ── Home Tab ──────────────────────────────────────────────────────────────────
function HomeTab({ firstName, events, pendingTasks, showAddEvent, setShowAddEvent, newEventTitle, setNewEventTitle, newEventTime, setNewEventTime, onAddEvent, showAddTask, setShowAddTask, newTaskTitle, setNewTaskTitle, onAddTask, onToggleTask, onDeleteTask, onDeleteEvent, saving, kidsCount, totalTasks }: {
  firstName: string; events: Event[]; pendingTasks: Task[];
  showAddEvent: boolean; setShowAddEvent: (v: boolean) => void;
  newEventTitle: string; setNewEventTitle: (v: string) => void;
  newEventTime: string; setNewEventTime: (v: string) => void;
  onAddEvent: () => void; showAddTask: boolean; setShowAddTask: (v: boolean) => void;
  newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  onAddTask: () => void; onToggleTask: (id: string, c: boolean) => void;
  onDeleteTask: (id: string) => void; onDeleteEvent: (id: string) => void;
  saving: boolean; kidsCount: number; totalTasks: number;
}) {
  return (
    <>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.2rem" }}>{greetText(firstName)}</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{todayLabel()}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Kids", value: kidsCount, icon: "👧", accent: "#818cf8" },
          { label: "Events Today", value: events.length, icon: "📅", accent: "#34d399" },
          { label: "Tasks Pending", value: pendingTasks.length, icon: "✅", accent: "#f472b6" },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}30`, borderRadius: "16px", padding: "1.25rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{icon}</div>
            <div style={{ fontSize: "1.9rem", fontWeight: 800, lineHeight: 1, color: accent }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <section style={sectionCard}>
          <SectionHeader title="Today's Schedule" accent="#34d399" onAdd={() => setShowAddEvent(true)} />
          {showAddEvent && (
            <InlineForm onCancel={() => setShowAddEvent(false)} onSave={onAddEvent} saving={saving} disabled={!newEventTitle.trim()}>
              <input autoFocus placeholder="Event title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddEvent()} style={inputSt} />
              <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} style={{ ...inputSt, colorScheme: "dark" }} />
            </InlineForm>
          )}
          {events.length === 0 && !showAddEvent ? <Empty text="No events today" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {events.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} />)}
            </div>
          )}
        </section>

        <section style={sectionCard}>
          <SectionHeader title="Tasks & Chores" accent="#f472b6" onAdd={() => setShowAddTask(true)} />
          {showAddTask && (
            <InlineForm onCancel={() => setShowAddTask(false)} onSave={onAddTask} saving={saving} disabled={!newTaskTitle.trim()}>
              <input autoFocus placeholder="Task title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddTask()} style={inputSt} />
            </InlineForm>
          )}
          {pendingTasks.length === 0 && !showAddTask ? <Empty text="No pending tasks" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pendingTasks.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} onToggle={onToggleTask} onDelete={onDeleteTask} />)}
              {pendingTasks.length > 6 && <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>+{pendingTasks.length - 6} more in Tasks</p>}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

interface GCalEvent { id: string | null; title: string; start: string | null; end: string | null; allDay: boolean; location: string | null }

// ── Calendar Tab ──────────────────────────────────────────────────────────────
function CalendarTab({ events, onDeleteEvent, showAddEvent, setShowAddEvent, newEventTitle, setNewEventTitle, newEventTime, setNewEventTime, onAddEvent, saving, provider }: {
  events: Event[]; onDeleteEvent: (id: string) => void;
  showAddEvent: boolean; setShowAddEvent: (v: boolean) => void;
  newEventTitle: string; setNewEventTitle: (v: string) => void;
  newEventTime: string; setNewEventTime: (v: string) => void;
  onAddEvent: () => void; saving: boolean; provider: string;
}) {
  const [view, setView] = useState<CalView>("day")
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d
  })
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState("")

  useEffect(() => {
    if (provider !== "google") return
    setGcalLoading(true)
    fetch("/api/gcal")
      .then(async (r) => {
        const d = await r.json()
        if (r.status === 401) {
          setGcalError("session_expired")
        } else if (d.events) {
          setGcalEvents(d.events)
        } else {
          setGcalError("Could not load Google Calendar")
        }
        setGcalLoading(false)
      })
      .catch(() => { setGcalError("Could not load Google Calendar"); setGcalLoading(false) })
  }, [provider])

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
          <button onClick={() => setShowAddEvent(true)} style={{ ...savePillStyle, marginLeft: "0.5rem" }}>+ Add</button>
        </div>
      </div>

      {showAddEvent && (
        <div style={{ maxWidth: "480px", marginBottom: "1.5rem" }}>
          <InlineForm onCancel={() => setShowAddEvent(false)} onSave={onAddEvent} saving={saving} disabled={!newEventTitle.trim()}>
            <input autoFocus placeholder="Event title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddEvent()} style={inputSt} />
            <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} style={{ ...inputSt, colorScheme: "dark" }} />
          </InlineForm>
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
          {gcalError && gcalError !== "session_expired" && (
            <span style={{ color: "#f87171" }}>⚠ {gcalError}</span>
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
          {events.length === 0 && gcalEventsForDate(today).length === 0
            ? <Empty text="No events for today" />
            : <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {events.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} />)}
                {gcalEventsForDate(today).map((ev) => <GCalEventRow key={ev.id} event={ev} />)}
              </div>
          }
        </div>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} style={navArrow}>←</button>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Week of {weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} style={navArrow}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0.5rem" }}>
            {getWeekDays().map((day) => {
              const ds = day.toISOString().split("T")[0]
              const isToday = ds === today
              const dayEvs = eventsForDate(day)
              const gcEvs = gcalEventsForDate(ds)
              return (
                <div key={ds} style={{ background: isToday ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)", border: isToday ? "1.5px solid #34d399" : "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem 0.5rem", minHeight: "100px" }}>
                  <p style={{ fontSize: "0.7rem", color: isToday ? "#34d399" : "var(--muted)", fontWeight: isToday ? 700 : 400, textAlign: "center", marginBottom: "0.375rem" }}>
                    {day.toLocaleDateString("en-GB", { weekday: "short" })}
                  </p>
                  <p style={{ fontSize: "1rem", fontWeight: 700, textAlign: "center", color: isToday ? "#34d399" : "var(--text)", marginBottom: "0.5rem" }}>{day.getDate()}</p>
                  {dayEvs.map((ev) => (
                    <div key={ev.id} style={{ fontSize: "0.65rem", background: "rgba(52,211,153,0.15)", borderRadius: "4px", padding: "0.15rem 0.3rem", marginBottom: "0.2rem", color: "#34d399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.start_time ? fmtTime(ev.start_time) + " " : ""}{ev.title}
                    </div>
                  ))}
                  {gcEvs.map((ev) => (
                    <div key={ev.id ?? ev.title} style={{ fontSize: "0.65rem", background: "rgba(99,102,241,0.15)", borderRadius: "4px", padding: "0.15rem 0.3rem", marginBottom: "0.2rem", color: "#818cf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📅 {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {view === "month" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={navArrow}>←</button>
            <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
              {monthDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={navArrow}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0.25rem", marginBottom: "0.5rem" }}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, padding: "0.25rem" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "0.25rem" }}>
            {getMonthDays().map((day, idx) => {
              if (!day) return <div key={idx} />
              const ds = day.toISOString().split("T")[0]
              const isToday = ds === today
              const dayEvs = eventsForDate(day)
              const gcEvs = gcalEventsForDate(ds)
              const totalEvs = dayEvs.length + gcEvs.length
              return (
                <div key={ds} style={{ background: isToday ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.02)", border: isToday ? "1.5px solid #34d399" : "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", minHeight: "72px" }}>
                  <p style={{ fontSize: "0.78rem", fontWeight: isToday ? 700 : 400, color: isToday ? "#34d399" : "var(--text)", textAlign: "center", marginBottom: "0.25rem" }}>{day.getDate()}</p>
                  {dayEvs.slice(0, 2).map((ev) => (
                    <div key={ev.id} style={{ fontSize: "0.6rem", background: "rgba(52,211,153,0.15)", borderRadius: "3px", padding: "0.1rem 0.25rem", color: "#34d399", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                  ))}
                  {gcEvs.slice(0, 2 - Math.min(dayEvs.length, 2)).map((ev) => (
                    <div key={ev.id ?? ev.title} style={{ fontSize: "0.6rem", background: "rgba(99,102,241,0.15)", borderRadius: "3px", padding: "0.1rem 0.25rem", color: "#818cf8", marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                  ))}
                  {totalEvs > 2 && <p style={{ fontSize: "0.55rem", color: "var(--muted)", textAlign: "center" }}>+{totalEvs - 2}</p>}
                </div>
              )
            })}
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
      <div style={{ maxWidth: "600px" }}>
        {showAddTask && (
          <InlineForm onCancel={() => setShowAddTask(false)} onSave={onAddTask} saving={saving} disabled={!newTaskTitle.trim()}>
            <input autoFocus placeholder="Task title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAddTask()} style={inputSt} />
          </InlineForm>
        )}
        {pending.length === 0 && done.length === 0 && !showAddTask && <Empty text="No tasks yet — add one above!" />}
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

// ── Insights Tab ──────────────────────────────────────────────────────────────
function InsightsTab({ scannedEvents, signedUpAt, provider, onRefresh }: { scannedEvents: ScannedEventRow[]; signedUpAt: string; provider: string; onRefresh: () => Promise<{ error?: string }> }) {
  const [filter, setFilter] = useState<string>("upcoming")
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  async function handleRefresh() {
    setRefreshing(true)
    setScanError(null)
    const result = await onRefresh()
    if (result.error) {
      setScanError(result.error)
    } else {
      setLastRefreshed(new Date().toLocaleTimeString())
    }
    setRefreshing(false)
  }
  const today = todayStr()
  const signupDate = signedUpAt.split("T")[0]

  // Only events from sign-up date onwards, with a known date
  const relevant = scannedEvents.filter((e) => e.event_date && e.event_date >= signupDate)

  // Separate upcoming vs past (relative to today)
  const upcoming = relevant.filter((e) => e.event_date! >= today).sort((a, b) => a.event_date! < b.event_date! ? -1 : 1)
  const past = relevant.filter((e) => e.event_date! < today).sort((a, b) => a.event_date! > b.event_date! ? -1 : 1)

  // Days until helper
  function daysUntil(date: string) {
    const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000)
    if (diff === 0) return { label: "Today", color: "#f472b6" }
    if (diff === 1) return { label: "Tomorrow", color: "#fbbf24" }
    if (diff <= 7) return { label: `In ${diff} days`, color: "#34d399" }
    return { label: `In ${diff} days`, color: "var(--muted)" }
  }

  const TYPE_FILTERS = [
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "past", label: "Past", count: past.length },
    { id: "school_event", label: "School", count: relevant.filter((e) => e.event_type === "school_event").length },
    { id: "appointment", label: "Appointments", count: relevant.filter((e) => e.event_type === "appointment").length },
    { id: "medical", label: "Medical", count: relevant.filter((e) => e.event_type === "medical").length },
  ]

  const displayList =
    filter === "upcoming" ? upcoming :
    filter === "past" ? past :
    relevant.filter((e) => e.event_type === filter).sort((a, b) => a.event_date! < b.event_date! ? -1 : 1)

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.3rem" }}>Family Insights</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            Family-related emails detected since you joined · {upcoming.length} upcoming event{upcoming.length !== 1 ? "s" : ""}
            {lastRefreshed && <span style={{ marginLeft: "0.5rem", opacity: 0.6 }}>· Updated {lastRefreshed}</span>}
          </p>
        </div>
        {provider === "google" && (
          <button onClick={handleRefresh} disabled={refreshing} style={{ ...savePillStyle, background: refreshing ? "rgba(251,191,36,0.3)" : "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#000", flexShrink: 0 }}>
            {refreshing ? "Scanning…" : "↻ Refresh Insights"}
          </button>
        )}
      </div>

      {/* Error / token-expired banner */}
      {scanError === "token_expired" && (
        <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: "12px", padding: "0.875rem 1.125rem", marginBottom: "1.25rem", fontSize: "0.85rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          ⚠ Your Google session has expired —{" "}
          <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#fbbf24", textDecoration: "underline", cursor: "pointer", fontSize: "0.85rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
            sign out and sign back in
          </button>
          {" "}to reconnect Gmail.
        </div>
      )}
      {scanError && scanError !== "token_expired" && (
        <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "12px", padding: "0.875rem 1.125rem", marginBottom: "1.25rem", fontSize: "0.85rem", color: "#f87171" }}>
          ⚠ Scan failed — please try again. If the problem persists, sign out and back in.
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {TYPE_FILTERS.map(({ id, label, count }) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            padding: "0.35rem 0.875rem", borderRadius: "20px", border: "none", cursor: "pointer",
            background: filter === id ? "#fbbf24" : "rgba(255,255,255,0.06)",
            color: filter === id ? "#000" : "var(--muted)",
            fontSize: "0.78rem", fontWeight: filter === id ? 700 : 400,
            fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: "0.35rem",
          }}>
            {label}
            {count > 0 && (
              <span style={{ background: filter === id ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.05rem 0.4rem", fontSize: "0.65rem", fontWeight: 700 }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {relevant.length === 0 ? (
        <div style={{ ...sectionCard, textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
          <p style={{ fontWeight: 600, marginBottom: "0.375rem" }}>No insights yet</p>
          <p style={{ fontSize: "0.85rem" }}>We'll automatically detect school events, appointments, and more from your inbox.</p>
        </div>
      ) : displayList.length === 0 ? (
        <Empty text={`No ${filter === "upcoming" ? "upcoming" : filter === "past" ? "past" : filter} events found`} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {displayList.map((ev) => {
            const orgColor = ev.organization_type ? ORG_TYPE_COLOR[ev.organization_type] ?? "#818cf8" : "#818cf8"
            const isUpcoming = ev.event_date! >= today
            const countdown = isUpcoming ? daysUntil(ev.event_date!) : null
            return (
              <div key={ev.id} style={{ background: isUpcoming ? "rgba(251,191,36,0.04)" : "rgba(255,255,255,0.02)", border: isUpcoming ? "1px solid rgba(251,191,36,0.2)" : "1px solid var(--border)", borderRadius: "14px", padding: "1.125rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                  <div style={{ fontSize: "1.4rem", flexShrink: 0, marginTop: "0.1rem" }}>{EVENT_TYPE_ICON[ev.event_type] ?? "📧"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{ev.title}</p>
                      {ev.organization_name && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "20px", background: `${orgColor}22`, color: orgColor, border: `1px solid ${orgColor}44` }}>
                          {ev.organization_name}
                        </span>
                      )}
                      {countdown && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "20px", background: `${countdown.color}22`, color: countdown.color, border: `1px solid ${countdown.color}44`, marginLeft: "auto" }}>
                          {countdown.label}
                        </span>
                      )}
                    </div>
                    {ev.event_date && (
                      <p style={{ fontSize: "0.75rem", color: isUpcoming ? "#fbbf24" : "var(--muted)", marginBottom: "0.375rem" }}>
                        📆 {new Date(ev.event_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>
                      {ev.snippet}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.5rem", opacity: 0.6 }}>From: {ev.source_from}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ profile: initialProfile, kids, setKids }: {
  profile: ProfileData; kids: KidRow[]; setKids: (k: KidRow[]) => void
}) {
  const [draft, setDraft] = useState({
    firstName: initialProfile.firstName,
    lastName: initialProfile.lastName,
    phone: initialProfile.phone,
    city: initialProfile.city,
    timezone: initialProfile.timezone,
    familyType: initialProfile.familyType,
  })
  const [editKids, setEditKids] = useState(kids.map((k) => ({ id: k.id, name: k.name, dob: k.dob ?? "" })))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function setField<K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) {
    setDraft((p) => ({ ...p, [key]: val }))
  }

  async function saveAll() {
    setSaving(true)
    await Promise.all([
      fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: draft.firstName || null,
          last_name: draft.lastName || null,
          phone: draft.phone || null,
          city: draft.city || null,
          timezone: draft.timezone || null,
          family_type: draft.familyType || null,
        }),
      }),
      fetch("/api/kids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kids: editKids.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), dob: k.dob || null })) }),
      }),
    ])
    const updated = editKids.filter((k) => k.name.trim()).map((k) => ({ id: k.id, name: k.name.trim(), dob: k.dob || null }))
    setKids(updated)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Settings</h2>
        <button onClick={saveAll} disabled={saving} style={{ ...savePillStyle, padding: "0.65rem 1.75rem", fontSize: "0.875rem", background: saved ? "linear-gradient(135deg,#4ade80,#22c55e)" : saving ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)" }}>
          {saving ? "Saving…" : saved ? "✓ Changes Saved" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "680px" }}>

        {/* Personal Information — indigo */}
        <SettingsSection title="Personal Information" icon="👤" accent="#818cf8" bg="rgba(99,102,241,0.07)">
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Email</label>
            <div style={{ ...inputSt, color: "var(--muted)", background: "rgba(255,255,255,0.02)", cursor: "not-allowed", display: "flex", alignItems: "center" }}>{initialProfile.email}</div>
          </div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>First Name</label>
            <input style={inputSt} value={draft.firstName} onChange={(e) => setField("firstName", e.target.value)} placeholder="First name" />
          </div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Last Name</label>
            <input style={inputSt} value={draft.lastName} onChange={(e) => setField("lastName", e.target.value)} placeholder="Last name" />
          </div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Phone Number</label>
            <input type="tel" style={inputSt} value={draft.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
        </SettingsSection>

        {/* Location — emerald */}
        <SettingsSection title="Location" icon="📍" accent="#34d399" bg="rgba(52,211,153,0.07)">
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>City</label>
            <input style={inputSt} value={draft.city} onChange={(e) => setField("city", e.target.value)} placeholder="Your city" />
          </div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Timezone</label>
            <select value={draft.timezone} onChange={(e) => setField("timezone", e.target.value)} style={{ ...inputSt, cursor: "pointer", appearance: "none" }}>
              <option value="">Select timezone</option>
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
        </SettingsSection>

        {/* Family Type — sky */}
        <SettingsSection title="Family Type" icon="👨‍👩‍👧‍👦" accent="#60a5fa" bg="rgba(96,165,250,0.07)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {FAMILY_TYPE_OPTIONS.map((opt) => {
              const active = draft.familyType === opt.value
              return (
                <button key={opt.value} onClick={() => setField("familyType", opt.value)} style={{
                  textAlign: "left", padding: "1rem", borderRadius: "12px", cursor: "pointer",
                  background: active ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.03)",
                  border: active ? "1.5px solid rgba(96,165,250,0.6)" : "1px solid var(--border)",
                  transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: "1.25rem", marginBottom: "0.3rem" }}>{opt.icon}</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: active ? "#60a5fa" : "var(--text)" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem", lineHeight: 1.4 }}>{opt.description}</div>
                </button>
              )
            })}
          </div>
        </SettingsSection>

        {/* Kids — rose */}
        <SettingsSection title="Your Kids" icon="👧" accent="#f472b6" bg="rgba(244,114,182,0.07)">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {editKids.map((kid, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                <div>
                  <label style={fieldLabelStyle}>Name</label>
                  <input value={kid.name} placeholder="Child's name" onChange={(e) => setEditKids((prev) => prev.map((k, idx) => idx === i ? { ...k, name: e.target.value } : k))} style={inputSt} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Date of Birth</label>
                  <input type="date" value={kid.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => setEditKids((prev) => prev.map((k, idx) => idx === i ? { ...k, dob: e.target.value } : k))} style={{ ...inputSt, colorScheme: "dark" }} />
                </div>
                <button onClick={() => setEditKids((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", color: "#f87171", cursor: "pointer", padding: "0.625rem 0.75rem", fontSize: "0.875rem" }}>×</button>
              </div>
            ))}
            <button onClick={() => setEditKids((prev) => [...prev, { id: "", name: "", dob: "" }])} style={{ background: "none", border: "2px dashed rgba(244,114,182,0.3)", borderRadius: "10px", padding: "0.625rem", color: "#f472b6", fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", width: "100%" }}>+ Add child</button>
          </div>
        </SettingsSection>
      </div>
    </>
  )
}

// ── Shared small components ───────────────────────────────────────────────────
function SectionHeader({ title, accent, onAdd }: { title: string; accent: string; onAdd: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{title}</h3>
      <button onClick={onAdd} style={{ background: `${accent}22`, border: `1px solid ${accent}44`, borderRadius: "8px", padding: "0.3rem 0.75rem", color: accent, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>+ Add</button>
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

function GCalEventRow({ event }: { event: GCalEvent }) {
  const timeStr = event.allDay ? "All day" : event.start ? fmtTime(event.start.split("T")[1]?.slice(0, 5) ?? "") : ""
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(99,102,241,0.06)", borderRadius: "10px", border: "1px solid rgba(99,102,241,0.2)" }}>
      <span style={{ fontSize: "0.85rem" }}>📅</span>
      {timeStr && <span style={{ fontSize: "0.72rem", color: "#818cf8", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{timeStr}</span>}
      <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
      <span style={{ fontSize: "0.65rem", color: "#818cf8", background: "rgba(99,102,241,0.15)", borderRadius: "6px", padding: "0.1rem 0.4rem", flexShrink: 0 }}>Google</span>
    </div>
  )
}

function EventRow({ event, onDelete }: { event: Event; onDelete: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--border)" }}>
      {event.start_time && <span style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600, minWidth: "56px", flexShrink: 0 }}>{fmtTime(event.start_time)}</span>}
      <span style={{ flex: 1, fontSize: "0.875rem" }}>{event.title}</span>
      <button onClick={() => onDelete(event.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1 }}>×</button>
    </div>
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
const sectionCard: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.25rem" }
const inputSt: React.CSSProperties = { width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "rgba(10,8,20,0.7)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.875rem", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }
const fieldRowStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.375rem" }
const fieldLabelStyle: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }
const savePillStyle: React.CSSProperties = { background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", borderRadius: "8px", padding: "0.45rem 1rem", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap", flexShrink: 0 }
const navArrow: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.35rem 0.75rem", color: "var(--text)", cursor: "pointer", fontSize: "0.9rem", fontFamily: "'Inter',sans-serif" }
const fabStyle = (open: boolean): React.CSSProperties => ({ width: "54px", height: "54px", borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: open ? "1.8rem" : "1.6rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(99,102,241,0.55)", display: "flex", alignItems: "center", justifyContent: "center", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 })
