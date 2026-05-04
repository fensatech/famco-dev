"use client"
import { useState } from "react"
import { signOut } from "next-auth/react"
import type { ScannedEventAction } from "@/types"
import type { ScannedEventRow } from "../types"
import { todayStr, fmtTime, addDays } from "../lib/date"
import { EVENT_TYPE_ICON, EVENT_TYPE_LABEL } from "../lib/events"
import { INSIGHT_CATEGORIES, sortEvents, insightsDaysUntil, insightsFmtDate } from "../lib/insights"
import { getScannedEventMemberName, getScannedEventMemberType } from "../lib/scanned-event-members"
import { savePillStyle, sectionCard } from "../styles"
import { Empty } from "../components/shared/Empty"

function EventCard({
  ev,
  action,
  assigneeOptions,
  showType,
  today,
  isAddedCal,
  isAddedTask,
  isReminderAdded,
  onAddCal,
  onAddTask,
  onAddReminder,
  onAssign,
  onToggleHandled,
}: {
  ev: ScannedEventRow
  action?: ScannedEventAction
  assigneeOptions: string[]
  showType?: boolean
  today: string
  isAddedCal?: boolean
  isAddedTask?: boolean
  isReminderAdded?: boolean
  onAddCal?: () => Promise<void>
  onAddTask?: () => Promise<void>
  onAddReminder?: () => Promise<void>
  onAssign?: (assignedTo: string | null) => Promise<void>
  onToggleHandled?: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState<"cal" | "task" | "reminder" | "handled" | null>(null)

  async function doAddCal(e: { stopPropagation(): void }) {
    e.stopPropagation()
    if (!onAddCal) return
    setAdding("cal")
    await onAddCal()
    setAdding(null)
  }

  async function doAddTask(e: { stopPropagation(): void }) {
    e.stopPropagation()
    if (!onAddTask) return
    setAdding("task")
    await onAddTask()
    setAdding(null)
  }

  async function doAddReminder(e: { stopPropagation(): void }) {
    e.stopPropagation()
    if (!onAddReminder) return
    setAdding("reminder")
    await onAddReminder()
    setAdding(null)
  }

  async function doToggleHandled(e: { stopPropagation(): void }) {
    e.stopPropagation()
    if (!onToggleHandled) return
    setAdding("handled")
    await onToggleHandled()
    setAdding(null)
  }

  async function doAssign(value: string) {
    if (!onAssign) return
    await onAssign(value || null)
  }

  const dateStr = ev.event_date ? String(ev.event_date).slice(0, 10) : null
  const isUpcoming = !!dateStr && dateStr >= today
  const countdown = dateStr && isUpcoming ? insightsDaysUntil(dateStr, today) : null
  const handled = action?.status === "handled"
  const memberName = getScannedEventMemberName(ev)
  const memberType = getScannedEventMemberType(ev)
  const memberBadgeColor =
    memberType === "adult"
      ? "#818cf8"
      : memberType === "pet"
        ? "#fbbf24"
        : memberType === "family"
          ? "#34d399"
          : "#f472b6"

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      style={{
        background: expanded ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${handled ? "rgba(34,197,94,0.35)" : ev.urgency === "high" ? "rgba(248,113,113,0.3)" : expanded ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
        borderRadius: "12px",
        padding: "0.875rem 1rem",
        cursor: "pointer",
        transition: "all 0.15s",
        opacity: handled ? 0.92 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{EVENT_TYPE_ICON[ev.event_type] ?? "📧"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{ev.calendar_title ?? ev.title}</span>
            {ev.urgency === "high" && <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(248,113,113,0.2)", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}>URGENT</span>}
            {memberName && <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.05rem 0.4rem", borderRadius: "20px", background: `${memberBadgeColor}22`, color: memberBadgeColor, border: `1px solid ${memberBadgeColor}44` }}>{memberName}{memberType === "child" && ev.grade ? ` · ${ev.grade}` : ""}</span>}
            {showType && <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(255,255,255,0.07)", color: "var(--muted)", border: "1px solid var(--border)" }}>{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}</span>}
            {handled && <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.28)" }}>HANDLED</span>}
            {action?.assigned_to && <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.05rem 0.35rem", borderRadius: "20px", background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.28)" }}>Assigned: {action.assigned_to}</span>}
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
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.15rem" }}>{(ev.snippet ?? "").slice(0, 120)}{(ev.snippet ?? "").length > 120 ? "…" : ""}</p>
          )}

          {expanded && (
            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem", alignItems: "center" }}>
                <label style={{ fontSize: "0.68rem", color: "var(--muted)", fontWeight: 600 }}>Assign</label>
                <select
                  value={action?.assigned_to ?? ""}
                  onChange={(e) => void doAssign(e.target.value)}
                  style={{ minWidth: "160px", borderRadius: "8px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "var(--text)", padding: "0.35rem 0.5rem", fontSize: "0.72rem", fontFamily: "'Inter',sans-serif" }}
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              {ev.organization_name && (
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}><strong style={{ color: "var(--text)" }}>{ev.organization_name}</strong>{ev.organization_type ? ` · ${ev.organization_type.replace("_", " ")}` : ""}</p>
              )}
              {ev.source_from && <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>✉ {ev.source_from}</p>}
              {ev.school_name && <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>🏫 {ev.school_name}</p>}
              {ev.grade && <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "0.3rem" }}>📚 Grade: {ev.grade}</p>}
              {ev.snippet && (
                <div style={{ marginTop: "0.5rem", background: "rgba(15,23,42,0.03)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.625rem 0.75rem" }}>
                  <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Email preview</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{ev.snippet}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: "0.375rem", marginTop: "0.625rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
        {ev.event_date && (
          <button onClick={doAddCal} disabled={!!isAddedCal || adding !== null} style={{ fontSize: "0.68rem", padding: "0.2rem 0.625rem", borderRadius: "6px", border: `1px solid ${isAddedCal ? "rgba(52,211,153,0.4)" : "rgba(99,102,241,0.3)"}`, background: isAddedCal ? "rgba(52,211,153,0.08)" : "none", color: isAddedCal ? "#34d399" : "#818cf8", cursor: isAddedCal || adding !== null ? "default" : "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s", fontWeight: 600 }}>
            {isAddedCal ? "✓ In Calendar" : adding === "cal" ? "Adding…" : "+ Calendar"}
          </button>
        )}
        <button onClick={doAddTask} disabled={!!isAddedTask || adding !== null} style={{ fontSize: "0.68rem", padding: "0.2rem 0.625rem", borderRadius: "6px", border: `1px solid ${isAddedTask ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.14)"}`, background: isAddedTask ? "rgba(52,211,153,0.08)" : "none", color: isAddedTask ? "#34d399" : "var(--muted)", cursor: isAddedTask || adding !== null ? "default" : "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s", fontWeight: 500 }}>
          {isAddedTask ? "✓ In Tasks" : adding === "task" ? "Adding…" : "+ Task"}
        </button>
        {onAddReminder && (
          <button onClick={doAddReminder} disabled={!!isReminderAdded || adding !== null} style={{ fontSize: "0.68rem", padding: "0.2rem 0.625rem", borderRadius: "6px", border: `1px solid ${isReminderAdded ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.24)"}`, background: isReminderAdded ? "rgba(139,92,246,0.08)" : "none", color: "#8B5CF6", cursor: isReminderAdded || adding !== null ? "default" : "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s", fontWeight: 600 }}>
            {isReminderAdded ? "✓ Reminder set" : adding === "reminder" ? "Adding…" : "Remind me"}
          </button>
        )}
        {onToggleHandled && (
          <button onClick={doToggleHandled} disabled={adding !== null} style={{ fontSize: "0.68rem", padding: "0.2rem 0.625rem", borderRadius: "6px", border: `1px solid ${handled ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.24)"}`, background: handled ? "rgba(34,197,94,0.08)" : "none", color: "#22c55e", cursor: adding !== null ? "default" : "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s", fontWeight: 600 }}>
            {adding === "handled" ? "Saving…" : handled ? "Reopen" : "Mark handled"}
          </button>
        )}
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

interface Props {
  scannedEvents: ScannedEventRow[]
  insightActions: ScannedEventAction[]
  assigneeOptions: string[]
  provider: string
  onRefresh: () => Promise<{ error?: string }>
  onAddEvent: (title: string, date: string, time: string | null, memberName?: string | null) => Promise<boolean>
  onAddTask: (title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly") => Promise<boolean>
  onAddReminder: (data: { source_type: "scanned_event"; source_id: string; title: string; note?: string | null; remind_at: string }) => Promise<boolean>
  onUpdateAction: (scannedEventId: string, data: { status?: "new" | "handled"; assigned_to?: string | null; last_action?: "calendar" | "task" | "reminder" | "handled" | null }) => Promise<boolean>
}

export function InsightsTab({ scannedEvents, insightActions, assigneeOptions, provider, onRefresh, onAddEvent, onAddTask, onAddReminder, onUpdateAction }: Props) {
  const [section, setSection] = useState<string>("dashboard")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [addedToCalendar, setAddedToCalendar] = useState<Set<string>>(new Set())
  const [addedAsTask, setAddedAsTask] = useState<Set<string>>(new Set())
  const [addedAsReminder, setAddedAsReminder] = useState<Set<string>>(new Set())
  const actionsById = new Map(insightActions.map((action) => [action.scanned_event_id, action]))

  async function handleRefresh() {
    setRefreshing(true)
    setScanError(null)
    const result = await onRefresh()
    if (result.error) setScanError(result.error)
    else setLastRefreshed(new Date().toLocaleTimeString())
    setRefreshing(false)
  }

  async function handleAddToCalendar(ev: ScannedEventRow): Promise<void> {
    const memberName = getScannedEventMemberName(ev)
    const ok = await onAddEvent(
      ev.calendar_title ?? ev.title,
      String(ev.event_date ?? "").slice(0, 10),
      ev.start_time ?? null,
      memberName && memberName !== "Family" ? memberName : null,
    )
    if (ok) {
      setAddedToCalendar((prev) => new Set(prev).add(ev.id))
      await onUpdateAction(ev.id, { last_action: "calendar" })
    }
  }

  async function handleAddAsTask(ev: ScannedEventRow): Promise<void> {
    const memberName = getScannedEventMemberName(ev)
    const memberType = getScannedEventMemberType(ev)
    const ok = await onAddTask(
      ev.calendar_title ?? ev.title,
      undefined,
      undefined,
      undefined,
      memberType === "adult" ? memberName ?? undefined : undefined,
    )
    if (ok) {
      setAddedAsTask((prev) => new Set(prev).add(ev.id))
      await onUpdateAction(ev.id, { last_action: "task" })
    }
  }

  async function handleAddReminder(ev: ScannedEventRow): Promise<void> {
    const remindAt = ev.event_date
      ? new Date(`${String(ev.event_date).slice(0, 10)}T09:00:00`).toISOString()
      : (() => {
          const next = new Date()
          next.setDate(next.getDate() + 1)
          next.setHours(9, 0, 0, 0)
          return next.toISOString()
        })()
    const ok = await onAddReminder({
      source_type: "scanned_event",
      source_id: ev.id,
      title: ev.calendar_title ?? ev.title,
      note: ev.special_instructions ?? ev.snippet ?? null,
      remind_at: remindAt,
    })
    if (ok) {
      setAddedAsReminder((prev) => new Set(prev).add(ev.id))
      await onUpdateAction(ev.id, { last_action: "reminder" })
    }
  }

  async function handleAssign(ev: ScannedEventRow, assignedTo: string | null): Promise<void> {
    await onUpdateAction(ev.id, { assigned_to: assignedTo })
  }

  async function handleToggleHandled(ev: ScannedEventRow): Promise<void> {
    const current = actionsById.get(ev.id)
    const nextStatus = current?.status === "handled" ? "new" : "handled"
    await onUpdateAction(ev.id, { status: nextStatus, last_action: nextStatus === "handled" ? "handled" : current?.last_action ?? null })
  }

  const today = todayStr()
  const in7 = addDays(today, 7)

  const all = scannedEvents
  const actionNeeded = sortEvents(all.filter((e) => {
    const action = actionsById.get(e.id)
    return action?.status !== "handled" && (e.urgency === "high" || !!e.special_instructions)
  }), sortOrder)
  const thisWeek = all
    .filter((e) => {
      const d = e.event_date ? String(e.event_date).slice(0, 10) : null
      return d && d >= today && d <= in7
    })
    .sort((a, b) => String(a.event_date ?? "").localeCompare(String(b.event_date ?? "")))

  const categoryData = INSIGHT_CATEGORIES
    .map((cat) => ({
      ...cat,
      events: sortEvents(all.filter((e) => cat.types.includes(e.event_type)), sortOrder),
    }))
    .filter((c) => c.events.length > 0)

  const subscriptions = categoryData.find((c) => c.id === "subscriptions")?.events ?? []
  const activities = categoryData.find((c) => c.id === "activities")?.events ?? []
  const monthlyTotal = subscriptions.filter((e) => e.recurrence === "monthly").reduce((sum, e) => sum + Number(e.amount ?? 0), 0)
  const annualTotal = subscriptions.filter((e) => e.recurrence === "annual").reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

  const errorBanner = scanError === "token_expired"
    ? <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#fbbf24" }}>⚠ Google session expired — <button onClick={() => signOut({ callbackUrl: "/" })} style={{ background: "none", border: "none", color: "#fbbf24", textDecoration: "underline", cursor: "pointer", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", padding: 0 }}>sign out and back in</button> to reconnect.</div>
    : scanError
      ? <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "12px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#f87171" }}>⚠ Scan failed — please try again.</div>
      : null

  const activeSectionEvents =
    section === "dashboard" ? []
      : section === "all" ? sortEvents(all, sortOrder)
      : section === "thisweek" ? sortEvents(thisWeek, sortOrder)
      : section === "action" ? sortEvents(actionNeeded, sortOrder)
      : categoryData.find((c) => c.id === section)?.events ?? []

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Family Insights</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
            {all.length} emails · {thisWeek.length} this week · {actionNeeded.length} action needed
            {lastRefreshed && <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>· Updated {lastRefreshed}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
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

      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {[
          { id: "dashboard", label: "Dashboard", icon: "🏠", count: undefined },
          { id: "thisweek", label: "This Week", icon: "📅", count: thisWeek.length },
          { id: "action", label: "Action Needed", icon: "⚡", count: actionNeeded.length },
          ...categoryData.map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: c.events.length })),
          { id: "all", label: "All Emails", icon: "📧", count: all.length },
        ].map(({ id, label, icon, count }) => (
          <button key={id} onClick={() => setSection(id)} style={{ padding: "0.3rem 0.75rem", borderRadius: "20px", border: "none", cursor: "pointer", background: section === id ? "#fbbf24" : "rgba(255,255,255,0.06)", color: section === id ? "#000" : "var(--muted)", fontSize: "0.75rem", fontWeight: section === id ? 700 : 400, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {icon} {label}
            {count !== undefined && count > 0 && (
              <span style={{ background: section === id ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.05rem 0.35rem", fontSize: "0.6rem", fontWeight: 700 }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <div style={{ ...sectionCard, textAlign: "center", padding: "3.5rem 2rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--text)", fontSize: "1rem" }}>Your family inbox, decoded</p>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.65, maxWidth: "380px", margin: "0 auto 1.75rem" }}>
            Famco reads your Gmail to surface school events, appointments, kids&apos; activities, bills, and subscriptions — organised in one place automatically.
          </p>
          {provider === "google" && (
            <button onClick={handleRefresh} disabled={refreshing} style={{ ...savePillStyle, background: refreshing ? "rgba(245,158,11,0.3)" : "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "#000", padding: "0.75rem 2rem", fontSize: "0.875rem" }}>
              {refreshing ? "Scanning…" : "✦ Scan My Inbox"}
            </button>
          )}
        </div>
      ) : section === "dashboard" ? (
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
                onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.borderColor = `${color}33`}>
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
                {actionNeeded.slice(0, 5).map((ev) => (
                  <EventCard key={ev.id} ev={ev} action={actionsById.get(ev.id)} assigneeOptions={assigneeOptions} showType today={today}
                    isAddedCal={addedToCalendar.has(ev.id)}
                    isAddedTask={addedAsTask.has(ev.id)}
                    isReminderAdded={addedAsReminder.has(ev.id)}
                    onAddCal={ev.event_date ? () => handleAddToCalendar(ev) : undefined}
                    onAddTask={() => handleAddAsTask(ev)}
                    onAddReminder={() => handleAddReminder(ev)}
                    onAssign={(assignedTo) => handleAssign(ev, assignedTo)}
                    onToggleHandled={() => handleToggleHandled(ev)}
                  />
                ))}
              </div>
            </div>
          )}

          {thisWeek.length > 0 && (
            <div>
              <InsightsSectionHeader icon="📅" title="This Week" count={thisWeek.length} accent="#34d399" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {thisWeek.map((ev) => (
                  <EventCard key={ev.id} ev={ev} action={actionsById.get(ev.id)} assigneeOptions={assigneeOptions} showType today={today}
                    isAddedCal={addedToCalendar.has(ev.id)}
                    isAddedTask={addedAsTask.has(ev.id)}
                    isReminderAdded={addedAsReminder.has(ev.id)}
                    onAddCal={ev.event_date ? () => handleAddToCalendar(ev) : undefined}
                    onAddTask={() => handleAddAsTask(ev)}
                    onAddReminder={() => handleAddReminder(ev)}
                    onAssign={(assignedTo) => handleAssign(ev, assignedTo)}
                    onToggleHandled={() => handleToggleHandled(ev)}
                  />
                ))}
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
                  {preview.map((ev) => (
                    <EventCard key={ev.id} ev={ev} action={actionsById.get(ev.id)} assigneeOptions={assigneeOptions} today={today}
                      isAddedCal={addedToCalendar.has(ev.id)}
                      isAddedTask={addedAsTask.has(ev.id)}
                      isReminderAdded={addedAsReminder.has(ev.id)}
                      onAddCal={ev.event_date ? () => handleAddToCalendar(ev) : undefined}
                      onAddTask={() => handleAddAsTask(ev)}
                      onAddReminder={() => handleAddReminder(ev)}
                      onAssign={(assignedTo) => handleAssign(ev, assignedTo)}
                      onToggleHandled={() => handleToggleHandled(ev)}
                    />
                  ))}
                  {remaining > 0 && <button onClick={() => setSection(cat.id)} style={{ background: "none", border: "none", color: cat.accent, cursor: "pointer", fontSize: "0.78rem", textAlign: "left", padding: "0.25rem 0" }}>+ {remaining} more →</button>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {activeSectionEvents.length === 0
            ? <Empty text={`No ${section} emails found`} />
            : activeSectionEvents.map((ev) => (
              <EventCard key={ev.id} ev={ev} action={actionsById.get(ev.id)} assigneeOptions={assigneeOptions} showType today={today}
                isAddedCal={addedToCalendar.has(ev.id)}
                isAddedTask={addedAsTask.has(ev.id)}
                isReminderAdded={addedAsReminder.has(ev.id)}
                onAddCal={ev.event_date ? () => handleAddToCalendar(ev) : undefined}
                onAddTask={() => handleAddAsTask(ev)}
                onAddReminder={() => handleAddReminder(ev)}
                onAssign={(assignedTo) => handleAssign(ev, assignedTo)}
                onToggleHandled={() => handleToggleHandled(ev)}
              />
            ))}
        </div>
      )}
    </>
  )
}
