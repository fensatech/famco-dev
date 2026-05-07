"use client"
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { signOut } from "next-auth/react"
import type { ReminderOffsetMinutes } from "@/lib/reminders"
import type { Event, Task } from "@/lib/db"
import type { CalendarMemberOption, GCalEvent, ScannedEventRow } from "../types"
import { todayStr } from "../lib/date"
import { fmtTime } from "../lib/date"
import { getScannedEventMemberName, getScannedEventMemberType, matchesScannedEventMember } from "../lib/scanned-event-members"
import { navArrow, savePillStyle, fieldLabelStyle, inputSt } from "../styles"
import { AddEventModal } from "../components/modals/AddEventModal"
import type { CoParentingSchedule, CoParentingOverride } from "../types"
import { resolveParent } from "../lib/coparenting"
import { ScannedEventBlock } from "../components/shared/ScannedEventBlock"
import { GCalEventRow } from "../components/shared/GCalEventRow"
import { EventRow } from "../components/shared/EventRow"

type CalView = "day" | "week" | "month"

interface Props {
  events: Event[]
  tasks: Task[]
  onDeleteEvent: (id: string) => void
  onUpdateEvent: (id: string, data: Partial<Event>) => void
  onAddEvent: (title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes, recurrence?: string | null) => Promise<boolean>
  saving: boolean
  provider: string
  memberOptions: CalendarMemberOption[]
  scannedEvents: ScannedEventRow[]
  gcalEvents: GCalEvent[]
  setGcalEvents: (e: GCalEvent[]) => void
  gcalLoaded: boolean
  setGcalLoaded: (v: boolean) => void
  onEventsRefresh: (evs: Event[]) => void
  onOpenBilling: () => void
  openSignal?: number
  coparentingSchedule?: CoParentingSchedule | null
  coparentingOverrides?: CoParentingOverride[]
  readOnly?: boolean
}

function IcsImportModal({ memberOptions, importing, importResult, fileInputRef, onImport, onClose }: {
  memberOptions: CalendarMemberOption[]
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
  const allMembers = [{ name: "Family", color: "#6b7280", kind: "family" as const }, ...memberOptions]

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
                {allMembers.map((m) => {
                  const active = selectedMember === m.name
                  return (
                    <button key={`${m.kind}-${m.name}`} onClick={() => setSelectedMember(m.name)} style={{ padding: "0.35rem 0.875rem", borderRadius: "20px", border: `1.5px solid ${active ? m.color : "rgba(255,255,255,0.1)"}`, background: active ? `${m.color}22` : "rgba(255,255,255,0.04)", color: active ? m.color : "var(--muted)", fontSize: "0.8rem", fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{m.name}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={fieldLabelStyle}>2. Choose .ics file *</label>
              <p style={{ marginTop: "0.35rem", color: "#6366f1", fontSize: "0.74rem", fontWeight: 700 }}>Click to browse and import calendar events</p>
              <div onClick={() => fileInputRef.current?.click()} style={{ marginTop: "0.5rem", border: `2px dashed ${fileName ? "rgba(129,140,248,0.45)" : "rgba(99,102,241,0.32)"}`, borderRadius: "12px", padding: "1.25rem", textAlign: "center", cursor: "pointer", background: fileName ? "rgba(129,140,248,0.08)" : "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(192,132,252,0.08))", transition: "all 0.15s" }}>
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
              <button onClick={() => { if (canImport) onImport(icsText!, selectedMember) }} disabled={!canImport} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: canImport ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", background: canImport ? "linear-gradient(135deg,#818cf8,#6366f1)" : "rgba(129,140,248,0.25)" }}>
                {importing ? "Importing…" : "Import Events"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function CalendarTab({ events, tasks, onDeleteEvent, onUpdateEvent, onAddEvent, saving, provider, memberOptions, scannedEvents, gcalEvents, setGcalEvents, gcalLoaded, setGcalLoaded, onEventsRefresh, onOpenBilling, openSignal, coparentingSchedule, coparentingOverrides = [], readOnly = false }: Props) {
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [initialEventDate, setInitialEventDate] = useState<string | undefined>(undefined)
  const [initialEventTime, setInitialEventTime] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<"all" | "events" | "tasks">("all")
  const [selectedCalTask, setSelectedCalTask] = useState<Task | null>(null)
  const [view, setView] = useState<CalView>("day")
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d
  })
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState("")
  const [gcalVisible, setGcalVisible] = useState(true)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedGcalEvent, setSelectedGcalEvent] = useState<GCalEvent | null>(null)
  const [gcalEditMode, setGcalEditMode] = useState(false)
  const [gcalDraft, setGcalDraft] = useState({ title: "", event_date: "", start_time: "", end_time: "", member_name: "" })
  const [gcalSaving, setGcalSaving] = useState(false)

  const closeAddEvent = useCallback(() => {
    setShowAddEvent(false)
    setInitialEventDate(undefined)
    setInitialEventTime(null)
  }, [])

  const openAddEventForDate = useCallback((date: string, time: string | null = null) => {
    if (readOnly) return
    setInitialEventDate(date)
    setInitialEventTime(time)
    setShowAddEvent(true)
  }, [readOnly])

  useEffect(() => {
    if (openSignal && !readOnly) {
      openAddEventForDate(todayStr(), null)
    }
  }, [openSignal, openAddEventForDate, readOnly])

  function openGcalModal(ev: GCalEvent) {
    if (readOnly) return
    const date = ev.start ? ev.start.split("T")[0] : todayStr()
    const startTime = !ev.allDay && ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) : ""
    const endTime = !ev.allDay && ev.end?.includes("T") ? ev.end.split("T")[1]?.slice(0, 5) : ""
    setGcalDraft({ title: ev.title, event_date: date, start_time: startTime ?? "", end_time: endTime ?? "", member_name: ev.member_name ?? "" })
    setGcalEditMode(false)
    setSelectedGcalEvent(ev)
  }

  function syncGcalEventLocally(eventId: string | null, updates: Partial<GCalEvent>) {
    setGcalEvents(gcalEvents.map((event) => event.id === eventId ? { ...event, ...updates } : event))
    setSelectedGcalEvent((current) => current?.id === eventId ? { ...current, ...updates } : current)
  }

  function removeGcalEventLocally(eventId: string | null) {
    setGcalEvents(gcalEvents.filter((event) => event.id !== eventId))
    setSelectedGcalEvent(null)
    setGcalEditMode(false)
  }

  async function hideGcalEvent(ev: GCalEvent) {
    if (!ev.id) {
      removeGcalEventLocally(ev.id)
      return
    }
    const response = await fetch("/api/gcal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id, hidden: true }),
    })
    if (response.ok) {
      removeGcalEventLocally(ev.id)
    }
  }

  const fetchGcal = useCallback(async (force = false) => {
    if (provider !== "google" || (!force && gcalLoaded)) return
    setGcalLoading(true)
    try {
      const r = await fetch("/api/gcal")
      const d = await r.json()
      if (r.status === 401 || d.error === "token_expired") {
        setGcalError("session_expired")
      } else if (r.status === 402 || d.error === "billing_required") {
        setGcalError("billing_required")
      } else if (d.error === "gcal_error") {
        setGcalError("gcal_error")
      } else if (Array.isArray(d.events)) {
        setGcalEvents(d.events)
        setGcalVisible(d.visible !== false)
        setGcalError("")
        setGcalLoaded(true)
      } else {
        setGcalError("session_expired")
      }
    } catch {
      setGcalError("network_error")
    } finally {
      setGcalLoading(false)
    }
  }, [gcalLoaded, provider, setGcalEvents, setGcalLoaded])

  async function saveGcalEdit() {
    if (!selectedGcalEvent || !gcalDraft.title.trim() || !gcalDraft.event_date) return
    const originalDate = selectedGcalEvent.start ? selectedGcalEvent.start.split("T")[0] : todayStr()
    const originalStart = !selectedGcalEvent.allDay && selectedGcalEvent.start?.includes("T") ? selectedGcalEvent.start.split("T")[1]?.slice(0, 5) ?? "" : ""
    const originalEnd = !selectedGcalEvent.allDay && selectedGcalEvent.end?.includes("T") ? selectedGcalEvent.end.split("T")[1]?.slice(0, 5) ?? "" : ""
    const originalMember = selectedGcalEvent.member_name ?? ""
    const detailsChanged =
      gcalDraft.title.trim() !== selectedGcalEvent.title ||
      gcalDraft.event_date !== originalDate ||
      gcalDraft.start_time !== originalStart ||
      gcalDraft.end_time !== originalEnd
    const memberChanged = gcalDraft.member_name !== originalMember

    if (!detailsChanged && !memberChanged) {
      setGcalEditMode(false)
      return
    }

    setGcalSaving(true)
    try {
      if (memberChanged && selectedGcalEvent.id) {
        const assignRes = await fetch("/api/gcal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: selectedGcalEvent.id, member_name: gcalDraft.member_name || null }),
        })
        if (assignRes.ok) {
          syncGcalEventLocally(selectedGcalEvent.id, { member_name: gcalDraft.member_name || null })
        }
      }

      if (detailsChanged) {
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: gcalDraft.title.trim(),
            event_date: gcalDraft.event_date,
            start_time: gcalDraft.start_time || null,
            end_time: gcalDraft.end_time || null,
            description: selectedGcalEvent.description || null,
            member_name: gcalDraft.member_name || null,
            source: "gcal",
          }),
        })
        if (res.ok) {
          const { event } = await res.json()
          onEventsRefresh([...events, event])
          await hideGcalEvent(selectedGcalEvent)
        }
      } else {
        setGcalEditMode(false)
      }
    } finally {
      setGcalSaving(false)
    }
  }

  const memberList = [{ name: "All", color: "#6b7280" }, { name: "Family", color: "#818cf8" }, ...memberOptions.map((member) => ({ name: member.name, color: member.color }))]
  const scheduledScanned = scannedEvents.filter((e) => !!e.event_date && e.auto_add_to_calendar)

  function scannedForDate(ds: string) {
    return scheduledScanned.filter((e) => String(e.event_date ?? "").slice(0, 10) === ds)
  }

  function filteredScanned(evts: ScannedEventRow[]) {
    return evts.filter((event) => matchesScannedEventMember(event, memberFilter))
  }

  function scannedEventColor(event: ScannedEventRow) {
    const memberName = getScannedEventMemberName(event)
    const memberType = getScannedEventMemberType(event)
    if (memberType === "family" || !memberName) return "#818cf8"
    return memberOptions.find((member) => member.name.toLowerCase() === memberName.toLowerCase())?.color ?? "#60a5fa"
  }

  function filteredGcalEvents(evts: GCalEvent[]) {
    if (!memberFilter) return evts
    if (memberFilter === "Family") return evts.filter((event) => !event.member_name)
    return evts.filter((event) => (event.member_name ?? "").toLowerCase() === memberFilter.toLowerCase())
  }

  useEffect(() => {
    void fetchGcal(false)
  }, [fetchGcal])

  const today = todayStr()

  function gcalEventsForDate(ds: string) {
    return filteredGcalEvents(gcalEvents).filter((e) => e.start && (e.start.split("T")[0] === ds || e.start === ds))
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
    const dateEvents = events.filter((e) => e.event_date === ds)
    if (!memberFilter) return dateEvents
    if (memberFilter === "Family") return dateEvents.filter((e) => !e.member_name)
    return dateEvents.filter((e) => (e.member_name ?? "").toLowerCase() === memberFilter.toLowerCase())
  }

  function tasksForDate(ds: string) {
    const dateTasks = tasks.filter((t) => !t.completed && t.due_date === ds)
    if (!memberFilter) return dateTasks
    if (memberFilter === "Family") return dateTasks.filter((t) => !t.assignee_name)
    return dateTasks.filter((t) => (t.assignee_name ?? "").toLowerCase() === memberFilter.toLowerCase())
  }

  async function handleAddEvent(title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes, recurrence?: string | null) {
    const ok = await onAddEvent(title, date, time, memberName, reminderOffsetMinutes, recurrence)
    if (ok) closeAddEvent()
  }

  function isInteractiveCalendarTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && !!target.closest("[data-cal-interactive='true']")
  }

  function timeFromSlot(event: ReactMouseEvent<HTMLDivElement>, earliestHour: number, hourHeight: number) {
    const rect = event.currentTarget.getBoundingClientRect()
    const y = Math.max(0, event.clientY - rect.top)
    const rawMinutes = earliestHour * 60 + (y / hourHeight) * 60
    const roundedMinutes = Math.round(rawMinutes / 15) * 15
    const totalMinutes = Math.max(0, Math.min(23 * 60 + 45, roundedMinutes))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  const calendarShellBg = "linear-gradient(180deg, rgba(251,252,255,0.98), rgba(237,242,255,0.96))"
  const calendarHeaderBg = "linear-gradient(180deg, rgba(221,228,250,0.98), rgba(232,238,252,0.95))"
  const calendarMutedCellBg = "rgba(203,213,225,0.24)"
  const calendarCurrentCellBg = "rgba(255,255,255,0.82)"
  const calendarTodayBg = "rgba(99,102,241,0.12)"
  const calendarPanelBg = "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(241,245,255,0.88))"

  return (
    <>
      {readOnly && (
        <div style={{ marginBottom: "1rem", borderRadius: "14px", padding: "0.85rem 0.95rem", border: "1px solid rgba(99,102,241,0.18)", background: "rgba(99,102,241,0.08)", color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.55 }}>
          You can review the shared calendar here, but only adults, co-parents, or the owner can import calendars, add events, or edit household schedule items.
        </div>
      )}
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
                  <div><div style={fieldLabelStyle}>Family Member</div><div style={{ fontSize: "0.82rem", marginTop: "0.2rem", color: "var(--muted)" }}>{selectedGcalEvent.member_name || "Family"}</div></div>
                  <div><div style={fieldLabelStyle}>Source</div><div style={{ fontSize: "0.78rem", color: "#818cf8", marginTop: "0.2rem" }}>Google Calendar</div></div>
                </div>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <button onClick={() => void hideGcalEvent(selectedGcalEvent)} style={{ padding: "0.65rem 1rem", borderRadius: "10px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Hide from Famco</button>
                  <button onClick={() => setGcalEditMode(true)} style={{ flex: 1, padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Edit / Assign</button>
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
                  {memberOptions.length > 0 && (
                    <div>
                      <label style={fieldLabelStyle}>Family Member</label>
                      <select value={gcalDraft.member_name} onChange={(e) => setGcalDraft((d) => ({ ...d, member_name: e.target.value }))} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}>
                        <option value="">Family</option>
                        {memberOptions.map((member) => (
                          <option key={`${member.kind}-${member.name}`} value={member.name}>{member.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.55, background: "rgba(99,102,241,0.06)", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                    Family member assignment stays attached to the synced Google event. If you change the title, date, or time, Famco saves a local copy and hides the original synced item to avoid duplicates.
                  </p>
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

      {/* Task detail popup */}
      {selectedCalTask && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setSelectedCalTask(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(244,114,182,0.4)", borderRadius: "20px", padding: "1.5rem", width: "100%", maxWidth: "400px", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>✅ Task</h3>
              <button onClick={() => setSelectedCalTask(null)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{selectedCalTask.title}</div>
              {selectedCalTask.due_date && (
                <div style={{ fontSize: "0.8rem", color: "#f472b6", fontWeight: 500 }}>
                  📅 {new Date(selectedCalTask.due_date + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  {selectedCalTask.due_time && ` · ${fmtTime(selectedCalTask.due_time)}`}
                </div>
              )}
              {selectedCalTask.notes && (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.5, background: "rgba(244,114,182,0.06)", borderRadius: "8px", padding: "0.625rem 0.75rem" }}>{selectedCalTask.notes}</div>
              )}
            </div>
            <button onClick={() => setSelectedCalTask(null)} style={{ marginTop: "1.25rem", width: "100%", padding: "0.65rem", borderRadius: "10px", background: "linear-gradient(135deg,#f472b6,#ec4899)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Done</button>
          </div>
        </div>
      )}

      {(() => {
        if (!coparentingSchedule || coparentingSchedule.schedule_type === "custom") return null
        const today2 = todayStr()
        const p = resolveParent(coparentingSchedule.schedule_type, coparentingSchedule.start_date, today2, coparentingOverrides)
        const pName = p === "a" ? coparentingSchedule.parent_a_name : coparentingSchedule.parent_b_name
        const pColor = p === "a" ? "#0EA5E9" : "#F59E0B"
        return (
          <div style={{ marginBottom: "1rem", padding: "0.5rem 1rem", borderRadius: "10px", background: `${pColor}12`, border: `1px solid ${pColor}30`, display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: pColor, flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{pName}&apos;s parenting time today</span>
          </div>
        )
      })()}

      <div style={{ marginBottom: "1.5rem", padding: "1.2rem 1.25rem", borderRadius: "24px", background: calendarPanelBg, border: "1px solid rgba(99,102,241,0.12)", boxShadow: "0 18px 42px rgba(99,102,241,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Calendar</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {(["day","week","month"] as CalView[]).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "0.4rem 0.875rem", borderRadius: "999px", border: view === v ? "none" : "1px solid rgba(99,102,241,0.14)", cursor: "pointer", background: view === v ? "linear-gradient(135deg,#34d399,#059669)" : "rgba(255,255,255,0.78)", color: view === v ? "#fff" : "#667085", fontSize: "0.8rem", fontWeight: view === v ? 700 : 600, fontFamily: "'Inter',sans-serif", textTransform: "capitalize", boxShadow: view === v ? "0 10px 22px rgba(52,211,153,0.22)" : "none" }}>{v}</button>
          ))}
          <button onClick={() => { if (!readOnly) { setShowImport(true); setImportResult(null) } }} disabled={readOnly} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "8px", padding: "0.4rem 0.75rem", color: "#818cf8", fontSize: "0.78rem", cursor: readOnly ? "not-allowed" : "pointer", opacity: readOnly ? 0.55 : 1, fontFamily: "'Inter',sans-serif" }}>↑ Import .ics</button>
          <button onClick={() => openAddEventForDate(todayStr(), null)} disabled={readOnly} style={{ ...savePillStyle, marginLeft: "0.25rem", opacity: readOnly ? 0.55 : 1, cursor: readOnly ? "not-allowed" : "pointer" }}>+ Add</button>
        </div>
      </div>

      {showAddEvent && <AddEventModal memberOptions={memberOptions} onSave={handleAddEvent} onCancel={closeAddEvent} saving={saving} initialDate={initialEventDate} initialTime={initialEventTime} />}

      {showImport && (
        <IcsImportModal
          memberOptions={memberOptions}
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
      {memberOptions.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {memberList.map((m) => {
            const active = m.name === "All" ? memberFilter === null : memberFilter === m.name
            return (
              <button key={m.name} onClick={() => setMemberFilter(m.name === "All" ? null : m.name)} style={{ padding: "0.3rem 0.82rem", borderRadius: "999px", border: `1.5px solid ${active ? m.color : "rgba(99,102,241,0.14)"}`, background: active ? `${m.color}18` : "rgba(255,255,255,0.78)", color: active ? m.color : "#667085", fontSize: "0.73rem", fontWeight: active ? 700 : 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {m.name === "All" ? "All Members" : m.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Type filter */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.875rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600, marginRight: "0.25rem" }}>Show:</span>
        {([["all", "All"], ["events", "Events"], ["tasks", "Tasks"]] as const).map(([f, label]) => (
          <button key={f} onClick={() => setTypeFilter(f)} style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", border: typeFilter === f ? "none" : "1px solid rgba(99,102,241,0.12)", background: typeFilter === f ? (f === "tasks" ? "linear-gradient(135deg,#f472b6,#ec4899)" : f === "events" ? "linear-gradient(135deg,#34d399,#059669)" : "linear-gradient(135deg,#818cf8,#6366f1)") : "rgba(255,255,255,0.78)", color: typeFilter === f ? "#fff" : "#667085", fontSize: "0.73rem", fontWeight: typeFilter === f ? 700 : 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Google Calendar status */}
      {provider === "google" && (
        <div style={{ marginBottom: "1rem", fontSize: "0.78rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
          {gcalLoading && <span>⟳ Loading Google Calendar…</span>}
          {!gcalLoading && !gcalError && !gcalVisible && (
            <span style={{ color: "#818cf8", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              Google Calendar items are hidden in Famco.
              <button
                onClick={() => {
                  setGcalLoading(true)
                  fetch("/api/gcal", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scope: "feed", visible: true }),
                  }).then(async (response) => {
                    const data = await response.json().catch(() => ({}))
                    if (response.ok && data.visible !== false) {
                      setGcalVisible(true)
                      setGcalLoaded(false)
                      void fetchGcal(true)
                    } else {
                      setGcalLoading(false)
                    }
                  }).catch(() => {
                    setGcalLoading(false)
                    setGcalError("network_error")
                  })
                }}
                style={{ background: "none", border: "none", color: "#818cf8", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}
              >
                Show them again
              </button>
            </span>
          )}
          {gcalError === "session_expired" && (
            <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⚠ Google session expired —{" "}
              <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#fbbf24", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                sign out and sign back in
              </button>
              {" "}to reconnect.
            </span>
          )}
          {gcalError === "billing_required" && (
            <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
              ⚠ Google Calendar syncing is paused because the trial window has ended —{" "}
              <button onClick={onOpenBilling} style={{ background: "none", border: "none", color: "#f87171", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                open Billing
              </button>
              {" "}to review next steps.
            </span>
          )}
          {gcalError === "gcal_error" && (
            <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              ⚠ Google Calendar error —{" "}
              <button onClick={() => {
                setGcalError("")
                void fetchGcal(true)
              }} style={{ background: "none", border: "none", color: "#f87171", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                retry
              </button>
            </span>
          )}
          {gcalError === "network_error" && <span style={{ color: "#f87171" }}>⚠ Could not reach Google Calendar — check your connection</span>}
          {!gcalLoading && !gcalError && gcalVisible && gcalEvents.length === 0 && <span style={{ color: "var(--muted)", opacity: 0.6 }}>No upcoming Google Calendar events</span>}
          {!gcalLoading && !gcalError && gcalVisible && gcalEvents.length > 0 && <span style={{ color: "#34d399" }}>✓ {gcalEvents.length} Google Calendar events synced</span>}
          {!gcalLoading && !gcalError && gcalVisible && !readOnly && (
            <button
              onClick={() => {
                setGcalLoading(true)
                fetch("/api/gcal", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scope: "feed", visible: false }),
                }).then(async (response) => {
                  const data = await response.json().catch(() => ({}))
                  if (response.ok && data.visible === false) {
                    setGcalVisible(false)
                    setGcalEvents([])
                    setSelectedGcalEvent(null)
                    setGcalEditMode(false)
                    setGcalError("")
                  } else {
                    setGcalError("gcal_error")
                  }
                  setGcalLoading(false)
                }).catch(() => {
                  setGcalLoading(false)
                  setGcalError("network_error")
                })
              }}
              style={{ background: "none", border: "none", color: "#818cf8", textDecoration: "underline", cursor: "pointer", fontSize: "0.78rem", fontFamily: "'Inter',sans-serif", padding: 0 }}
            >
              Hide synced Google events
            </button>
          )}
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div style={{ maxWidth: "600px" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>Today · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          {(() => {
            const todayDate = new Date(today)
            const todayEvents = eventsForDate(todayDate)
            const todayScanned = filteredScanned(scannedForDate(today))
            const todayTasks = tasksForDate(today)
            const showEvs = typeFilter !== "tasks"
            const showTasks = typeFilter !== "events"
            const totalItems = (showEvs ? todayEvents.length + gcalEventsForDate(today).length + todayScanned.length : 0) + (showTasks ? todayTasks.length : 0)
            return totalItems === 0
              ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)", fontSize: "0.875rem" }}>No {typeFilter === "tasks" ? "tasks" : typeFilter === "events" ? "events" : "events or tasks"} for today</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {showEvs && todayEvents.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} onUpdate={readOnly ? undefined : onUpdateEvent} kids={memberOptions} readOnly={readOnly} />)}
                  {showEvs && gcalEventsForDate(today).map((ev) => <GCalEventRow key={ev.id ?? ev.title} event={ev} onClick={() => openGcalModal(ev)} />)}
                  {showEvs && todayScanned.map((ev) => <ScannedEventBlock key={ev.id} ev={ev} color={scannedEventColor(ev)} />)}
                  {showTasks && todayTasks.map((t) => (
                    <div key={t.id} onClick={() => setSelectedCalTask(t)} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(244,114,182,0.06)", borderLeft: "3px solid #f472b6", borderRadius: "10px", border: "1px solid rgba(244,114,182,0.2)", cursor: "pointer" }}>
                      <span style={{ fontSize: "0.875rem" }}>✅</span>
                      <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 500 }}>{t.title}</span>
                      {t.due_time && <span style={{ fontSize: "0.75rem", color: "#f472b6", fontWeight: 600 }}>{fmtTime(t.due_time)}</span>}
                    </div>
                  ))}
                </div>
          })()}
        </div>
      )}

      {/* WEEK VIEW — compressed time grid */}
      {view === "week" && (() => {
        const HOUR_H = 64
        const HOUR_H_DEAD = 0
        const days = getWeekDays()

        const showEvs = typeFilter !== "tasks"
        const showTasks = typeFilter !== "events"
        const timedEntries: { start: string | null; end: string | null }[] = []
        days.forEach((day) => {
          const ds = day.toISOString().split("T")[0]
          if (showEvs) {
            eventsForDate(day).filter((e) => !!e.start_time).forEach((e) => timedEntries.push({ start: e.start_time, end: e.end_time }))
            gcalEventsForDate(ds).filter((e) => !e.allDay && e.start?.includes("T")).forEach((e) => {
              timedEntries.push({
                start: e.start!.split("T")[1]?.slice(0, 5) ?? null,
                end: e.end?.includes("T") ? e.end.split("T")[1]?.slice(0, 5) ?? null : null,
              })
            })
            filteredScanned(scannedForDate(ds)).filter((e) => !!e.start_time).forEach((e) => timedEntries.push({ start: e.start_time, end: e.end_time }))
          }
          if (showTasks) {
            tasksForDate(ds).filter((t) => !!t.due_time).forEach((t) => timedEntries.push({ start: t.due_time, end: null }))
          }
        })
        const timedHours = timedEntries
          .flatMap((entry) => [entry.start, entry.end])
          .filter((value): value is string => !!value)
          .map((value) => parseInt(value.split(":")[0] ?? "", 10))
          .filter((value) => Number.isFinite(value))
        const hasTimedEntries = timedHours.length > 0
        const earliestHour = hasTimedEntries ? Math.max(0, Math.min(...timedHours) - 1) : 8
        const latestHour = hasTimedEntries ? Math.min(23, Math.max(...timedHours) + 1) : 17
        const HOURS = Array.from({ length: latestHour - earliestHour + 1 }, (_, i) => earliestHour + i)
        function hourH(hour: number) { void hour; return HOUR_H }

        function toY(time: string | null): number {
          if (!time) return 0
          const [hNum, mNum] = time.split(":").map(Number)
          if (isNaN(hNum)) return 0
          let y = 0
          for (let i = 0; i < HOURS.length; i++) {
            if (HOURS[i] === hNum) { y += ((mNum || 0) / 60) * HOUR_H; return y }
            if (HOURS[i] > hNum) return y
            y += HOUR_H
          }
          return y
        }
        const totalH = HOURS.length * HOUR_H
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6)
        const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }} style={navArrow}>←</button>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500 }}>{weekLabel}</span>
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }} style={navArrow}>→</button>
            </div>
            <div style={{ border: "1px solid rgba(99,102,241,0.12)", borderRadius: "16px", overflow: "hidden", background: calendarShellBg, boxShadow: "0 16px 36px rgba(99,102,241,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,minmax(0,1fr))", background: calendarHeaderBg, borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 5 }}>
                <div />
                {days.map((day) => {
                  const ds = day.toISOString().split("T")[0]; const isToday = ds === today
                  return (
                    <div key={ds} style={{ textAlign: "center", padding: "0.5rem 0.25rem", borderLeft: "1px solid var(--border)", minWidth: 0 }}>
                      <div style={{ fontSize: "0.6rem", color: isToday ? "#4f46e5" : "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                      <div style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "0.1rem" }}>
                        <span style={isToday ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "50%", width: "30px", height: "30px", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.95rem", boxShadow: "0 10px 22px rgba(99,102,241,0.22)" } : { color: "var(--text)" }}>{day.getDate()}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,minmax(0,1fr))", borderBottom: "2px solid var(--border)", minHeight: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0.2rem 0.5rem 0.2rem 0", fontSize: "0.58rem", color: "var(--muted)" }}>all day</div>
                {days.map((day) => {
                  const ds = day.toISOString().split("T")[0]
                  const allDay = showEvs ? gcalEventsForDate(ds).filter((e) => e.allDay) : []
                  const allDayTasks = showTasks ? tasksForDate(ds).filter((t) => !t.due_time) : []
                  return (
                      <div
                        key={ds}
                        onDoubleClick={(event) => {
                          if (isInteractiveCalendarTarget(event.target)) return
                          openAddEventForDate(ds, null)
                        }}
                        style={{ borderLeft: "1px solid var(--border)", padding: "0.125rem 0.2rem", minWidth: 0 }}
                      >
                      {allDay.map((ev) => (
                        <div data-cal-interactive="true" key={ev.id ?? ev.title} onClick={() => openGcalModal(ev)} style={{ fontSize: "0.62rem", background: "rgba(99,102,241,0.2)", borderLeft: "2px solid #818cf8", borderRadius: "3px", padding: "0.1rem 0.3rem", color: "#818cf8", cursor: "pointer", marginBottom: "1px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title}</div>
                      ))}
                      {allDayTasks.map((t) => (
                        <div key={t.id} onClick={() => setSelectedCalTask(t)} style={{ fontSize: "0.62rem", background: "rgba(244,114,182,0.18)", borderLeft: "2px solid #f472b6", borderRadius: "3px", padding: "0.1rem 0.3rem", color: "#f472b6", marginBottom: "1px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", cursor: "pointer" }}>✅ {t.title}</div>
                      ))}
                    </div>
                  )
                })}
              </div>
              {!hasTimedEntries && (
                <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--muted)", background: "rgba(255,255,255,0.78)" }}>
                  <p style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>No timed events this week</p>
                  <p style={{ fontSize: "0.74rem", lineHeight: 1.55 }}>All-day items stay visible above, and the time grid will expand automatically once appointments or scheduled tasks are added.</p>
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: "540px", display: hasTimedEntries ? undefined : "none" }}>
                <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7,minmax(0,1fr))" }}>
                  <div>
                    {HOURS.map((h, i) => {
                      const hh = hourH(h)
                      return (
                        <div key={h} style={{ height: HOUR_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: "0.4rem" }}>
                          {i > 0 && <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: "-0.45em" }}>{`${h % 12 || 12}${h < 12 ? "AM" : "PM"}`}</span>}
                          {hh === HOUR_H_DEAD && i > 0 && <span style={{ fontSize: "0.42rem", color: "var(--muted)", opacity: 0.35 }}>·</span>}
                        </div>
                      )
                    })}
                  </div>
                  {days.map((day) => {
                    const ds = day.toISOString().split("T")[0]
                    const isToday = ds === today
                    const dayEvs = showEvs ? eventsForDate(day).filter((e) => !!e.start_time) : []
                    const gcEvs = showEvs ? gcalEventsForDate(ds).filter((e) => !e.allDay) : []
                    const scEvs = showEvs ? filteredScanned(scannedForDate(ds)).filter((e) => !!e.start_time) : []
                    const timedTasks = showTasks ? tasksForDate(ds).filter((t) => !!t.due_time) : []
                    return (
                      <div
                        key={ds}
                        onDoubleClick={(event) => {
                          if (isInteractiveCalendarTarget(event.target)) return
                          openAddEventForDate(ds, timeFromSlot(event, earliestHour, HOUR_H))
                        }}
                        style={{ position: "relative", borderLeft: "1px solid var(--border)", height: totalH, background: isToday ? "rgba(99,102,241,0.05)" : "transparent", minWidth: 0 }}
                      >
                        {HOURS.map((h) => (
                          <div key={h} style={{ position: "absolute", top: toY(`${h}:00`), left: 0, right: 0, borderTop: hourH(h) >= HOUR_H ? "1px solid rgba(255,255,255,0.04)" : "none", pointerEvents: "none" }} />
                        ))}
                        {dayEvs.map((ev) => {
                          const top = toY(ev.start_time); const bot = toY(ev.end_time); const h = Math.max(22, bot - top || HOUR_H / 2)
                          return <div data-cal-interactive="true" key={ev.id} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: "rgba(52,211,153,0.18)", borderLeft: "3px solid #34d399", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                            {ev.start_time && <div style={{ fontSize: "0.55rem", color: "#34d399", fontWeight: 700 }}>{fmtTime(ev.start_time)}</div>}
                            <div style={{ fontSize: "0.6rem", color: "#34d399", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          </div>
                        })}
                        {gcEvs.map((ev) => {
                          const t = ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) ?? null : null
                          const te = ev.end?.includes("T") ? ev.end.split("T")[1]?.slice(0, 5) ?? null : null
                          const top = toY(t); const h = Math.max(22, toY(te) - top || HOUR_H / 2)
                          return <div data-cal-interactive="true" key={ev.id ?? ev.title} onClick={() => openGcalModal(ev)} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: "rgba(99,102,241,0.18)", borderLeft: "3px solid #818cf8", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                            {t && <div style={{ fontSize: "0.55rem", color: "#818cf8", fontWeight: 700 }}>{fmtTime(t)}</div>}
                            <div style={{ fontSize: "0.6rem", color: "#818cf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                          </div>
                        })}
                        {scEvs.map((ev) => {
                          const c = scannedEventColor(ev); const top = toY(ev.start_time); const h = Math.max(22, toY(ev.end_time) - top || HOUR_H / 2)
                          return <div data-cal-interactive="true" key={ev.id} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: `${c}22`, borderLeft: `3px solid ${c}`, borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "default", zIndex: 1 }}>
                            {ev.start_time && <div style={{ fontSize: "0.55rem", color: c, fontWeight: 700 }}>{fmtTime(ev.start_time)}</div>}
                            <div style={{ fontSize: "0.6rem", color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.calendar_title ?? ev.title}</div>
                          </div>
                        })}
                        {timedTasks.map((t) => {
                          const top = toY(t.due_time); const h = 28
                          return <div data-cal-interactive="true" key={t.id} onClick={() => setSelectedCalTask(t)} style={{ position: "absolute", top, left: 2, right: 2, height: h, background: "rgba(244,114,182,0.18)", borderLeft: "3px solid #f472b6", borderRadius: "4px", padding: "2px 4px", overflow: "hidden", cursor: "pointer", zIndex: 1 }}>
                            <div style={{ fontSize: "0.55rem", color: "#f472b6", fontWeight: 700 }}>{fmtTime(t.due_time!)}</div>
                            <div style={{ fontSize: "0.6rem", color: "#f472b6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✅ {t.title}</div>
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
          <div style={{ border: "1px solid rgba(99,102,241,0.12)", borderRadius: "16px", overflow: "hidden", background: calendarShellBg, boxShadow: "0 16px 36px rgba(99,102,241,0.05)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", background: calendarHeaderBg }}>
              {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d) => (
                <div key={d} style={{ padding: "0.5rem 0.375rem", fontSize: "0.7rem", color: "#4b5563", fontWeight: 700, borderRight: "1px solid var(--border)", textAlign: "center", minWidth: 0 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}>
              {(() => {
                const days = getMonthDays()
                while (days.length % 7 !== 0) days.push(null)
                return days.map((day, idx) => {
                  if (!day) return <div key={idx} style={{ minHeight: "108px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: calendarMutedCellBg, minWidth: 0 }} />
                  const ds = day.toISOString().split("T")[0]
                  const isToday = ds === today
                  const isCurMonth = day.getMonth() === monthDate.getMonth()
                  const LIMIT = 3
                  const showMEvs = typeFilter !== "tasks"
                  const showMTasks = typeFilter !== "events"
                  const allEvs = [
                    ...(showMEvs ? eventsForDate(day).map((ev) => ({ key: ev.id, time: ev.start_time, label: ev.title, color: "#34d399", onClick: undefined as (() => void) | undefined })) : []),
                    ...(showMEvs ? gcalEventsForDate(ds).map((ev) => ({ key: ev.id ?? ev.title, time: !ev.allDay && ev.start?.includes("T") ? ev.start.split("T")[1]?.slice(0, 5) : null, label: ev.title, color: "#818cf8", onClick: () => openGcalModal(ev) })) : []),
                    ...(showMEvs ? filteredScanned(scannedForDate(ds)).map((ev) => ({ key: ev.id, time: ev.start_time, label: ev.calendar_title ?? ev.title, color: scannedEventColor(ev), onClick: undefined as (() => void) | undefined })) : []),
                    ...(showMTasks ? tasksForDate(ds).map((t) => ({ key: t.id, time: t.due_time, label: `✅ ${t.title}`, color: "#f472b6", onClick: () => setSelectedCalTask(t) })) : []),
                  ]
                  const visible = allEvs.slice(0, LIMIT)
                  const overflow = allEvs.length - LIMIT
                  return (
                    <div
                      key={ds}
                      onDoubleClick={(event) => {
                        if (isInteractiveCalendarTarget(event.target)) return
                        openAddEventForDate(ds, null)
                      }}
                      style={{ minHeight: "108px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "0.3rem 0.25rem", background: isToday ? calendarTodayBg : isCurMonth ? calendarCurrentCellBg : calendarMutedCellBg, minWidth: 0 }}
                    >
                      <div style={{ marginBottom: "0.25rem" }}>
                        <span style={{ display: "inline-flex", width: "22px", height: "22px", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: isToday ? "#6366f1" : "transparent", color: isToday ? "#fff" : isCurMonth ? "var(--text)" : "var(--muted)", fontSize: "0.75rem", fontWeight: isToday ? 700 : 400 }}>{day.getDate()}</span>
                      </div>
                      {visible.map((item) => (
                        <div data-cal-interactive="true" key={item.key} onClick={item.onClick} style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.6rem", padding: "0.1rem 0.25rem", marginBottom: "0.15rem", borderRadius: "3px", background: `${item.color}18`, borderLeft: `2px solid ${item.color}`, color: item.color, cursor: item.onClick ? "pointer" : "default", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", minWidth: 0 }}>
                          {item.time && <span style={{ flexShrink: 0, fontWeight: 700 }}>{fmtTime(item.time)}</span>}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{item.label}</span>
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
