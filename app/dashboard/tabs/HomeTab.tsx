"use client"
import { useState, useEffect, useMemo } from "react"
import type { ReminderOffsetMinutes } from "@/lib/reminders"
import type { Event, Task } from "@/lib/db"
import type { Tab, ExpenseRow, KidRow, CoParentingSchedule, CoParentingOverride, CalendarMemberOption } from "../types"
import type { Reminder } from "@/types"
import { resolveParent, findNextExchange, formatExchangeDate } from "../lib/coparenting"
import { todayStr, todayLabel, fmtTime } from "../lib/date"
import { sectionCard } from "../styles"
import { AddEventModal } from "../components/modals/AddEventModal"
import { AddTaskModal } from "../components/modals/AddTaskModal"
import { SectionHeader } from "../components/shared/SectionHeader"
import { EventRow } from "../components/shared/EventRow"
import { TaskRow } from "../components/shared/TaskRow"
import { NavIcon } from "../components/NavIcon"

interface Props {
  firstName: string
  familyType: string | null
  city: string
  timezone: string
  kids: KidRow[]
  events: Event[]
  pendingTasks: Task[]
  reminders: Reminder[]
  memberOptions: CalendarMemberOption[]
  assigneeOptions: string[]
  onAddEvent: (title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes) => Promise<boolean>
  onAddTask: (title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly", reminderOffsetMinutes?: ReminderOffsetMinutes) => Promise<boolean>
  onToggleTask: (id: string, c: boolean) => void
  onDeleteTask: (id: string) => void
  onDeleteEvent: (id: string) => void
  onDismissReminder: (id: string) => Promise<boolean>
  onSnoozeReminder: (id: string, remindAt: string) => Promise<boolean>
  saving: boolean
  totalTasks: number
  onNavigate: (tab: Tab) => void
  coparentingSchedule?: CoParentingSchedule | null
  coparentingOverrides?: CoParentingOverride[]
  readOnly?: boolean
}

export function HomeTab({ firstName, familyType, city, timezone, kids, events, pendingTasks, reminders, memberOptions, assigneeOptions, onAddEvent, onAddTask, onToggleTask, onDeleteTask, onDeleteEvent, onDismissReminder, onSnoozeReminder, saving, onNavigate, coparentingSchedule, coparentingOverrides = [], readOnly = false }: Props) {
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [todayExpenses, setTodayExpenses] = useState<ExpenseRow[]>([])
  const today = useMemo(() => todayStr(), [])

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

  const greetPart = (() => { const h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening" })()
  const setupChecklist = useMemo(() => {
    const gaps: string[] = []
    if (!city.trim() || !timezone.trim()) gaps.push("confirm your location")
    if (!familyType) gaps.push("choose your household type")
    if (kids.length === 0) {
      gaps.push("add children or household members")
    } else if (!kids.some((kid) => kid.schoolName || kid.daycareName || kid.grade)) {
      gaps.push("add school or daycare details")
    }
    return gaps
  }, [city, familyType, kids, timezone])
  const setupSummary =
    setupChecklist.length <= 2
      ? setupChecklist.join(" and ")
      : `${setupChecklist.slice(0, 2).join(" and ")} and more`

  const cpSchedule = coparentingSchedule && coparentingSchedule.schedule_type !== "custom" ? coparentingSchedule : null
  const cpTodayParent = cpSchedule ? resolveParent(cpSchedule.schedule_type, cpSchedule.start_date, today, coparentingOverrides) : null
  const cpParentName = cpTodayParent ? (cpTodayParent === "a" ? cpSchedule!.parent_a_name : cpSchedule!.parent_b_name) : null
  const cpNextExchange = cpSchedule ? findNextExchange(cpSchedule, coparentingOverrides, today) : null
  const cpAssignedKids = kids.filter((k) => (cpSchedule?.kid_ids ?? []).includes(k.id))

  async function handleAddEvent(title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes) {
    const ok = await onAddEvent(title, date, time, memberName, reminderOffsetMinutes)
    if (ok) setShowAddEvent(false)
  }

  async function handleAddTask(title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly", reminderOffsetMinutes?: ReminderOffsetMinutes) {
    const ok = await onAddTask(title, dueDate, dueTime, notes, assigneeName, recurrence, reminderOffsetMinutes)
    if (ok) setShowAddTask(false)
  }

  async function snoozeTomorrow(reminder: Reminder) {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(9, 0, 0, 0)
    await onSnoozeReminder(reminder.id, next.toISOString())
  }

  return (
    <>
      {showAddEvent && <AddEventModal memberOptions={memberOptions} onSave={handleAddEvent} onCancel={() => setShowAddEvent(false)} saving={saving} initialDate={today} />}
      {showAddTask && <AddTaskModal assigneeOptions={assigneeOptions} onSave={handleAddTask} onCancel={() => setShowAddTask(false)} saving={saving} />}
      {readOnly && (
        <div style={{ marginBottom: "1rem", borderRadius: "14px", padding: "0.9rem 1rem", border: "1px solid rgba(99,102,241,0.18)", background: "rgba(99,102,241,0.08)", color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.55 }}>
          You can review today&apos;s schedule and tasks, but only adults, co-parents, or the owner can add or change shared household items.
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>
          Good {greetPart}, {firstName || "there"}
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", fontWeight: 400 }}>{todayLabel()}</p>
      </div>

      {setupChecklist.length > 0 && (
        <div style={{ marginBottom: "1.5rem", borderRadius: "16px", background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.2)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg,#6366f1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.1rem" }}>✨</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.15rem" }}>Complete your family profile to improve Insights</p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>Head to Manage Family to {setupSummary} so Famco can match school, activity, and household emails more accurately.</p>
          </div>
          <button onClick={() => onNavigate("settings")} style={{ flexShrink: 0, padding: "0.45rem 0.875rem", borderRadius: "8px", background: "linear-gradient(135deg,#6366f1,#8B5CF6)", border: "none", color: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            Manage Family →
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {([
          { label: "Events Today", value: events.length, gradient: "linear-gradient(135deg,#0EA5E9,#6366F1)", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>) },
          { label: "Pending Tasks", value: pendingTasks.length, gradient: "linear-gradient(135deg,#EC4899,#F43F5E)", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>) },
          { label: "Active Reminders", value: reminders.length, gradient: "linear-gradient(135deg,#8B5CF6,#6366F1)", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5"/><path d="M9 17a3 3 0 006 0"/></svg>) },
        ] as { label: string; value: string | number; gradient: string; icon: React.ReactNode }[]).map(({ label, value, gradient, icon }) => (
          <div key={label} style={{ background: "#FFFFFF", borderRadius: "20px", padding: "1.375rem", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--text)" }}>{value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem", fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {cpSchedule && cpParentName && cpAssignedKids.length > 0 && (
        <div style={{ marginBottom: "1.5rem", borderRadius: "16px", background: "linear-gradient(135deg,rgba(6,182,212,0.08),rgba(99,102,241,0.06))", border: "1px solid rgba(6,182,212,0.2)", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#06B6D4,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem" }}>👨‍👧</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.1rem" }}>
              {cpAssignedKids.map((k) => k.name).join(", ")} {cpAssignedKids.length === 1 ? "is" : "are"} with {cpParentName} today
            </p>
            {cpNextExchange && (
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Next exchange: {formatExchangeDate(cpNextExchange, today, cpSchedule.exchange_time)}
                {cpSchedule.exchange_location ? ` · ${cpSchedule.exchange_location}` : ""}
              </p>
            )}
          </div>
          <button onClick={() => onNavigate("coparenting")} style={{ flexShrink: 0, padding: "0.35rem 0.75rem", borderRadius: "8px", background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.25)", color: "#06B6D4", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            Schedule →
          </button>
        </div>
      )}

      {reminders.length > 0 && (
        <section style={{ ...sectionCard, marginBottom: "1.5rem" }}>
          <SectionHeader title="Reminders" accent="#8B5CF6" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {reminders.slice(0, 4).map((reminder) => {
              const remindDate = new Date(reminder.remind_at)
              const when = remindDate.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
              return (
                <div key={reminder.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem 0.875rem", borderRadius: "12px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.16)" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg,#8B5CF6,#6366F1)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⏰</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{reminder.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#8B5CF6", fontWeight: 600, marginTop: "0.15rem" }}>{when}</div>
                    {reminder.note && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.25rem", lineHeight: 1.5 }}>{reminder.note}</div>}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                      <button onClick={() => void snoozeTomorrow(reminder)} style={{ borderRadius: "8px", border: "1px solid rgba(99,102,241,0.2)", background: "rgba(99,102,241,0.08)", color: "#6366F1", fontSize: "0.7rem", fontWeight: 600, padding: "0.25rem 0.55rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Snooze 1 day</button>
                      <button onClick={() => void onDismissReminder(reminder.id)} style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "var(--muted)", fontSize: "0.7rem", fontWeight: 600, padding: "0.25rem 0.55rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Dismiss</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        <section style={sectionCard}>
          <SectionHeader title="Today's Schedule" accent="#0EA5E9" onAdd={readOnly ? undefined : () => setShowAddEvent(true)} />
          {(() => {
            const todayTasks = pendingTasks.filter((t) => t.due_date === today)
            const total = events.length + todayTasks.length
            if (total === 0) return (
              <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>☀️</div>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem", color: "var(--text)" }}>Free day ahead</p>
                <p style={{ fontSize: "0.72rem", lineHeight: 1.55 }}>No events or tasks scheduled — add one or open the Calendar.</p>
              </div>
            )
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {events.map((ev) => <EventRow key={ev.id} event={ev} onDelete={onDeleteEvent} kids={memberOptions} readOnly={readOnly} />)}
                {todayTasks.map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", background: "rgba(244,114,182,0.06)", borderLeft: "3px solid #f472b6", borderRadius: "10px", border: "1px solid rgba(244,114,182,0.2)" }}>
                    <span style={{ fontSize: "0.8rem" }}>✅</span>
                    <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: "var(--text)" }}>{t.title}</span>
                    {t.due_time && <span style={{ fontSize: "0.7rem", color: "#f472b6", fontWeight: 600, flexShrink: 0 }}>{fmtTime(t.due_time)}</span>}
                  </div>
                ))}
              </div>
            )
          })()}
        </section>
        <section style={sectionCard}>
          <SectionHeader title="Tasks & Chores" accent="#EC4899" onAdd={readOnly ? undefined : () => setShowAddTask(true)} />
          {pendingTasks.length === 0 ? (
            <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>✅</div>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.2rem", color: "var(--text)" }}>All clear!</p>
              <p style={{ fontSize: "0.72rem", lineHeight: 1.55 }}>No pending tasks — add a chore or reminder.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pendingTasks.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} assigneeOptions={assigneeOptions} onToggle={onToggleTask} onDelete={onDeleteTask} readOnly={readOnly} />)}
              {pendingTasks.length > 6 && <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>+{pendingTasks.length - 6} more in Tasks</p>}
            </div>
          )}
        </section>
      </div>

      <div style={{ marginBottom: "0.875rem" }}>
        <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Explore</h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {([
          { id: "insights" as Tab,     label: "Insights",       desc: "Your family AI",        badge: "AI", gradient: "linear-gradient(145deg,#f59e0b,#ef4444)" },
          { id: "calendar" as Tab,     label: "Calendar",       desc: "Events & schedules",         gradient: "linear-gradient(145deg,#667eea,#764ba2)" },
          { id: "tasks" as Tab,        label: "Tasks",          desc: "Chores & to-dos",            gradient: "linear-gradient(145deg,#f093fb,#f5576c)" },
          { id: "data" as Tab,         label: "Knowledge",      desc: "Verified family facts",       gradient: "linear-gradient(145deg,#43e97b,#38f9d7)" },
          { id: "expenses" as Tab,     label: "Expenses",       desc: "Bills & spending",            gradient: "linear-gradient(145deg,#fa709a,#fee140)" },
          { id: "coparenting" as Tab,  label: "Co-Parenting",   desc: "Parenting schedules",         gradient: "linear-gradient(145deg,#06B6D4,#6366F1)" },
          { id: "settings" as Tab,     label: "Manage Family",  desc: "Your household profile",      gradient: "linear-gradient(145deg,#a18cd1,#fbc2eb)" },
        ] as { id: Tab; label: string; desc: string; badge?: string; gradient: string }[]).map(({ id, label, desc, badge, gradient }) => (
          <button key={id} onClick={() => onNavigate(id)} style={{ background: gradient, borderRadius: "20px", border: "none", padding: "1.375rem", textAlign: "left", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", transition: "transform 0.15s, box-shadow 0.15s", display: "flex", flexDirection: "column", gap: "0.5rem", position: "relative" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.18)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)" }}
          >
            {badge && <span style={{ position: "absolute", top: "0.75rem", right: "0.875rem", background: "rgba(255,255,255,0.28)", borderRadius: "20px", fontSize: "0.52rem", fontWeight: 800, padding: "0.15rem 0.45rem", color: "white", letterSpacing: "0.05em" }}>{badge}</span>}
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
