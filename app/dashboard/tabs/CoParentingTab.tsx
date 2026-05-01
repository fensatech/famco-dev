"use client"
import { useState } from "react"
import type { KidRow, CoParentingSchedule, CoParentingOverride } from "../types"
import { todayStr } from "../lib/date"
import { sectionCard } from "../styles"
import {
  resolveParent, buildWeekStrip, findNextExchange, formatExchangeDate,
  type WeekDayInfo,
} from "../lib/coparenting"

const PARENT_A = "#0EA5E9"
const PARENT_B = "#F59E0B"
const parentColor = (p: "a" | "b") => (p === "a" ? PARENT_A : PARENT_B)

const SCHEDULE_TYPES = [
  { value: "week_on_off",   label: "Week On / Week Off",    desc: "Full weeks alternate every 7 days",            pattern: "7 · 7" },
  { value: "223",           label: "2-2-3",                 desc: "2 days, 2 days, 3 days — 14-day rotation",     pattern: "AA·BB·AAA" },
  { value: "2255",          label: "2-2-5-5",               desc: "Short blocks then longer blocks",               pattern: "AA·BB·AAAAA·BBBBB" },
  { value: "alt_weekends",  label: "Alternating Weekends",  desc: "Weekdays with one parent, weekends alternate",  pattern: "WD + wknd" },
  { value: "custom",        label: "Custom / Manual",       desc: "Track manually — no auto-calculation",          pattern: "—" },
]

interface ScheduleDraft {
  schedule_type: string
  start_date: string
  exchange_time: string
  exchange_location: string
  parent_a_name: string
  parent_b_name: string
  kid_ids: string[]
}

interface OverrideDraft {
  date: string
  parent: "a" | "b"
  note: string
}

interface Props {
  kids: KidRow[]
  schedule: CoParentingSchedule | null
  overrides: CoParentingOverride[]
  loaded: boolean
  onSaveSchedule: (data: Omit<CoParentingSchedule, "id" | "profile_id" | "active" | "created_at">) => Promise<boolean>
  onAddOverride: (scheduleId: string, data: { override_date: string; assigned_to: string; note: string | null }) => Promise<boolean>
  onDeleteOverride: (id: string) => Promise<void>
}

function parentLabel(schedule: CoParentingSchedule, p: "a" | "b") {
  return p === "a" ? schedule.parent_a_name : schedule.parent_b_name
}

function fmtStartDate(s: string): string {
  const d = new Date(s + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

function fmtOverrideDate(s: string): string {
  const d = new Date(s + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
}

export function CoParentingTab({ kids, schedule, overrides, loaded, onSaveSchedule, onAddOverride, onDeleteOverride }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ScheduleDraft>({
    schedule_type: "week_on_off",
    start_date: todayStr(),
    exchange_time: "17:00",
    exchange_location: "",
    parent_a_name: "Me",
    parent_b_name: "Co-parent",
    kid_ids: [],
  })
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft>({ date: "", parent: "a", note: "" })
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const today = todayStr()
  const isCustom = schedule?.schedule_type === "custom"

  const todayParent = schedule && !isCustom
    ? resolveParent(schedule.schedule_type, schedule.start_date, today, overrides)
    : null
  const nextExchangeDate = schedule && !isCustom
    ? findNextExchange(schedule, overrides, today)
    : null
  const weekStrip = schedule && !isCustom
    ? buildWeekStrip(schedule, overrides, today)
    : []
  const assignedKids = kids.filter((k) => (schedule?.kid_ids ?? []).includes(k.id))

  function startEditing() {
    if (schedule) {
      setDraft({
        schedule_type: schedule.schedule_type,
        start_date: schedule.start_date,
        exchange_time: schedule.exchange_time ?? "17:00",
        exchange_location: schedule.exchange_location ?? "",
        parent_a_name: schedule.parent_a_name,
        parent_b_name: schedule.parent_b_name,
        kid_ids: schedule.kid_ids,
      })
    }
    setEditing(true)
  }

  function toggleKid(id: string) {
    setDraft((d) => ({
      ...d,
      kid_ids: d.kid_ids.includes(id) ? d.kid_ids.filter((k) => k !== id) : [...d.kid_ids, id],
    }))
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onSaveSchedule({
      schedule_type: draft.schedule_type,
      start_date: draft.start_date,
      exchange_time: draft.exchange_time || null,
      exchange_location: draft.exchange_location || null,
      parent_a_name: draft.parent_a_name || "Parent A",
      parent_b_name: draft.parent_b_name || "Parent B",
      kid_ids: draft.kid_ids,
    })
    setSaving(false)
    if (ok) setEditing(false)
  }

  async function handleAddOverride() {
    if (!schedule || !overrideDraft.date) return
    setSavingOverride(true)
    await onAddOverride(schedule.id, {
      override_date: overrideDraft.date,
      assigned_to: overrideDraft.parent,
      note: overrideDraft.note || null,
    })
    setSavingOverride(false)
    setOverrideDraft({ date: "", parent: "a", note: "" })
    setShowOverrideForm(false)
  }

  async function handleDeleteOverride(id: string) {
    setDeletingId(id)
    await onDeleteOverride(id)
    setDeletingId(null)
  }

  const showBuilder = !loaded || !schedule || editing

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: "0.25rem" }}>
          Co-Parenting
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Track parenting schedules, custody time, and handoffs across households.
        </p>
      </div>

      {!loaded && (
        <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "2rem 0" }}>Loading…</div>
      )}

      {/* ── Today + This Week (when schedule active and not custom) ── */}
      {loaded && schedule && !isCustom && !editing && (
        <>
          {/* Today card */}
          <div style={{ ...sectionCard, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Today</div>
              {todayParent ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                    <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: parentColor(todayParent), flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>
                      {parentLabel(schedule, todayParent)}&apos;s parenting time
                    </span>
                  </div>
                  {assignedKids.length > 0 && (
                    <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "1.375rem" }}>
                      {assignedKids.map((k) => k.name).join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Schedule begins {fmtStartDate(schedule.start_date)}</p>
              )}
            </div>

            {nextExchangeDate && (
              <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "1.25rem", minWidth: "160px" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Next Exchange</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                  {formatExchangeDate(nextExchangeDate, today, schedule.exchange_time)}
                </div>
                {schedule.exchange_location && (
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.2rem" }}>{schedule.exchange_location}</div>
                )}
              </div>
            )}
          </div>

          {/* Week strip */}
          <div style={{ ...sectionCard, marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "1rem" }}>This Week</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.375rem" }}>
              {weekStrip.map((day: WeekDayInfo) => (
                <div key={day.date} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                  padding: "0.625rem 0.375rem", borderRadius: "12px",
                  background: day.isToday ? `${parentColor(day.parent)}15` : "transparent",
                  border: day.isToday ? `1.5px solid ${parentColor(day.parent)}40` : "1px solid transparent",
                  position: "relative",
                }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--muted)" }}>{day.dayLabel}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: day.isToday ? 800 : 500, color: day.isToday ? "var(--text)" : "var(--muted)" }}>{day.dateNum}</span>
                  <div style={{
                    width: "28px", height: "20px", borderRadius: "10px",
                    background: parentColor(day.parent),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6rem", fontWeight: 800, color: "white",
                  }}>
                    {day.parent === "a" ? schedule.parent_a_name.slice(0, 1).toUpperCase() : schedule.parent_b_name.slice(0, 1).toUpperCase()}
                  </div>
                  {day.isExchange && (
                    <span style={{ position: "absolute", top: "-6px", right: "-2px", fontSize: "0.55rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0 3px", color: "var(--muted)", fontWeight: 600 }}>⇄</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: "0.875rem", display: "flex", gap: "1.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: PARENT_A }} />
                {schedule.parent_a_name}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: PARENT_B }} />
                {schedule.parent_b_name}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: "0.5rem" }}>⇄ = exchange day</span>
            </div>
          </div>
        </>
      )}

      {/* ── Active Schedule Summary (not editing) ── */}
      {loaded && schedule && !editing && (
        <div style={{ ...sectionCard, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.35rem" }}>Active Schedule</div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
                {SCHEDULE_TYPES.find((s) => s.value === schedule.schedule_type)?.label ?? schedule.schedule_type}
              </div>
            </div>
            <button onClick={startEditing} style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Edit</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.5rem", fontSize: "0.82rem", color: "var(--muted)" }}>
            <span>
              <span style={{ color: PARENT_A, fontWeight: 600 }}>●</span> {schedule.parent_a_name}
              {" · "}
              <span style={{ color: PARENT_B, fontWeight: 600 }}>●</span> {schedule.parent_b_name}
            </span>
            <span>Started {fmtStartDate(schedule.start_date)}</span>
            {schedule.exchange_time && <span>Exchange at {schedule.exchange_time}</span>}
            {schedule.exchange_location && <span>@ {schedule.exchange_location}</span>}
            {assignedKids.length > 0 && <span>Children: {assignedKids.map((k) => k.name).join(", ")}</span>}
          </div>
        </div>
      )}

      {/* ── Schedule Builder ── */}
      {showBuilder && (
        <div style={{ ...sectionCard, marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>
              {schedule ? "Edit Schedule" : "Set Up Parenting Schedule"}
            </h3>
            {editing && (
              <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            )}
          </div>

          {/* Parent names */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Parent Names</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {(["a", "b"] as const).map((p) => (
                <div key={p}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: parentColor(p), marginRight: "0.35rem" }} />
                    Parent {p.toUpperCase()}
                  </label>
                  <input
                    type="text"
                    value={p === "a" ? draft.parent_a_name : draft.parent_b_name}
                    onChange={(e) => setDraft((d) => ({ ...d, [p === "a" ? "parent_a_name" : "parent_b_name"]: e.target.value }))}
                    placeholder={p === "a" ? "Mom / Me / Sarah" : "Dad / Co-parent / James"}
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Schedule type */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Schedule Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem" }}>
              {SCHEDULE_TYPES.map((st) => {
                const active = draft.schedule_type === st.value
                return (
                  <button key={st.value} type="button" onClick={() => setDraft((d) => ({ ...d, schedule_type: st.value }))} style={{
                    padding: "0.875rem", borderRadius: "12px", textAlign: "left", cursor: "pointer",
                    border: active ? "2px solid #06B6D4" : "1.5px solid var(--border)",
                    background: active ? "rgba(6,182,212,0.08)" : "var(--bg)",
                    transition: "all 0.15s",
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: active ? "#06B6D4" : "var(--text)", marginBottom: "0.2rem" }}>{st.label}</div>
                    <div style={{ fontSize: "0.69rem", color: "var(--muted)", lineHeight: 1.4 }}>{st.desc}</div>
                    <div style={{ marginTop: "0.4rem", fontSize: "0.65rem", color: active ? "#06B6D4" : "var(--muted)", fontWeight: 700, letterSpacing: "0.04em" }}>{st.pattern}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Start date + exchange details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Schedule Start Date</label>
              <input type="date" value={draft.start_date} onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
                style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", fontFamily: "'Inter',sans-serif", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Exchange / Handoff Time (optional)</label>
              <input type="time" value={draft.exchange_time} onChange={(e) => setDraft((d) => ({ ...d, exchange_time: e.target.value }))}
                style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", fontFamily: "'Inter',sans-serif", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Exchange Location (optional)</label>
              <input type="text" value={draft.exchange_location} onChange={(e) => setDraft((d) => ({ ...d, exchange_location: e.target.value }))} placeholder="e.g. School pickup, Starbucks on Main St"
                style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "10px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.85rem", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Children */}
          {kids.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>Assign Children</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {kids.map((kid) => {
                  const selected = draft.kid_ids.includes(kid.id)
                  return (
                    <button key={kid.id} type="button" onClick={() => toggleKid(kid.id)} style={{
                      padding: "0.4rem 0.875rem", borderRadius: "20px", cursor: "pointer",
                      border: selected ? "1.5px solid #06B6D4" : "1.5px solid var(--border)",
                      background: selected ? "rgba(6,182,212,0.12)" : "var(--bg)",
                      color: selected ? "#06B6D4" : "var(--muted)",
                      fontSize: "0.8rem", fontWeight: selected ? 600 : 400,
                      fontFamily: "'Inter',sans-serif", transition: "all 0.15s",
                    }}>
                      {kid.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {kids.length === 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.5rem", background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "10px", border: "1px dashed var(--border)" }}>
              Add children in <strong style={{ color: "var(--text)" }}>Manage Family</strong> to assign them to this schedule.
            </p>
          )}

          <button onClick={handleSave} disabled={!draft.start_date || saving} style={{
            padding: "0.75rem 2rem", borderRadius: "10px", border: "none",
            background: !draft.start_date || saving ? "rgba(6,182,212,0.35)" : "linear-gradient(135deg,#06B6D4,#6366F1)",
            color: "white", fontSize: "0.875rem", fontWeight: 700,
            cursor: !draft.start_date || saving ? "not-allowed" : "pointer",
            fontFamily: "'Inter',sans-serif",
          }}>
            {saving ? "Saving…" : schedule ? "Update Schedule" : "Save Schedule"}
          </button>
        </div>
      )}

      {/* ── Exceptions / Overrides ── */}
      {loaded && schedule && !editing && (
        <div style={{ ...sectionCard }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>Exceptions & Overrides</div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Holidays, swaps, or one-off changes to the recurring schedule.</p>
            </div>
            {!showOverrideForm && (
              <button onClick={() => setShowOverrideForm(true)} style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", color: "#06B6D4", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                + Add exception
              </button>
            )}
          </div>

          {showOverrideForm && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Date</label>
                  <input type="date" value={overrideDraft.date} onChange={(e) => setOverrideDraft((d) => ({ ...d, date: e.target.value }))}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", outline: "none", colorScheme: "dark", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Assigned to</label>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    {(["a", "b"] as const).map((p) => (
                      <button key={p} type="button" onClick={() => setOverrideDraft((d) => ({ ...d, parent: p }))} style={{
                        flex: 1, padding: "0.5rem", borderRadius: "8px",
                        border: overrideDraft.parent === p ? `2px solid ${parentColor(p)}` : "1px solid var(--border)",
                        background: overrideDraft.parent === p ? `${parentColor(p)}18` : "var(--bg)",
                        color: overrideDraft.parent === p ? parentColor(p) : "var(--muted)",
                        fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                      }}>
                        {p === "a" ? schedule.parent_a_name.slice(0, 8) : schedule.parent_b_name.slice(0, 8)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "0.3rem" }}>Note (optional)</label>
                  <input type="text" value={overrideDraft.note} onChange={(e) => setOverrideDraft((d) => ({ ...d, note: e.target.value }))} placeholder="e.g. Spring Break, swap agreed"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => { setShowOverrideForm(false); setOverrideDraft({ date: "", parent: "a", note: "" }) }} style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
                <button onClick={handleAddOverride} disabled={!overrideDraft.date || savingOverride} style={{ padding: "0.4rem 0.875rem", borderRadius: "8px", border: "none", background: !overrideDraft.date || savingOverride ? "rgba(6,182,212,0.3)" : "linear-gradient(135deg,#06B6D4,#6366F1)", color: "white", fontSize: "0.8rem", fontWeight: 600, cursor: !overrideDraft.date || savingOverride ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
                  {savingOverride ? "Saving…" : "Save exception"}
                </button>
              </div>
            </div>
          )}

          {overrides.length === 0 && !showOverrideForm && (
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", padding: "0.75rem 0" }}>No exceptions recorded yet.</p>
          )}

          {overrides.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {overrides.map((o) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: parentColor(o.assigned_to as "a" | "b"), flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>{fmtOverrideDate(o.override_date)}</span>
                  <span style={{ fontSize: "0.78rem", color: parentColor(o.assigned_to as "a" | "b"), fontWeight: 600 }}>
                    → {parentLabel(schedule, o.assigned_to as "a" | "b")}
                  </span>
                  {o.note && <span style={{ fontSize: "0.75rem", color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.note}</span>}
                  <button onClick={() => handleDeleteOverride(o.id)} disabled={deletingId === o.id} style={{ marginLeft: "auto", background: "none", border: "none", color: "#f87171", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                    {deletingId === o.id ? "…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (no schedule, after load) ── */}
      {loaded && !schedule && !editing && (
        <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "16px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📅</div>
          <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.35rem" }}>No schedule yet</p>
          <p style={{ fontSize: "0.8rem", lineHeight: 1.6, maxWidth: "360px", margin: "0 auto 1.25rem" }}>
            Set up a recurring parenting schedule to track custody time, plan exchanges, and see who has the kids each day.
          </p>
          <button onClick={() => setEditing(true)} style={{ padding: "0.7rem 1.75rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,#06B6D4,#6366F1)", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Set up schedule
          </button>
        </div>
      )}
    </>
  )
}
