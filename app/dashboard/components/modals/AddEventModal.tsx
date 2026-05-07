"use client"
import { useState } from "react"
import { DEFAULT_REMINDER_OFFSET_MINUTES, getReminderOffsetLabel, REMINDER_OFFSET_OPTIONS, type ReminderOffsetMinutes } from "@/lib/reminders"
import type { CalendarMemberOption } from "../../types"
import { inputSt, fieldLabelStyle } from "../../styles"
import { todayStr } from "../../lib/date"

const RECURRENCE_OPTIONS = [
  { value: "", label: "No repeat" },
  { value: "daily", label: "Daily (14 days)" },
  { value: "weekly", label: "Weekly (26 weeks)" },
  { value: "monthly", label: "Monthly (12 months)" },
]

interface Props {
  onSave: (title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes, recurrence?: string | null) => void
  onCancel: () => void
  saving: boolean
  initialDate?: string
  initialTime?: string | null
  memberOptions?: CalendarMemberOption[]
}

export function AddEventModal({ onSave, onCancel, saving, initialDate, initialTime, memberOptions = [] }: Props) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(initialDate ?? todayStr())
  const [time, setTime] = useState(initialTime ?? "")
  const [memberName, setMemberName] = useState("")
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<ReminderOffsetMinutes>(DEFAULT_REMINDER_OFFSET_MINUTES)
  const [recurrence, setRecurrence] = useState("")

  function handleSave() {
    if (!title.trim() || !date) return
    onSave(title.trim(), date, time || null, memberName || null, reminderOffsetMinutes, recurrence || null)
  }

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
            <input autoFocus placeholder="e.g. Soccer practice, Doctor visit…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && title.trim() && handleSave()} style={{ ...inputSt, marginTop: "0.3rem", fontSize: "0.95rem" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={fieldLabelStyle}>Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
            </div>
            <div>
              <label style={fieldLabelStyle}>Time (optional)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={fieldLabelStyle}>Reminder</label>
              <select
                value={String(reminderOffsetMinutes)}
                onChange={(e) => setReminderOffsetMinutes(Number(e.target.value) as ReminderOffsetMinutes)}
                style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}
              >
                {REMINDER_OFFSET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getReminderOffsetLabel(option.value, "event", !!time)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Repeat</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {memberOptions.length > 0 && (
            <div>
              <label style={fieldLabelStyle}>Family Member</label>
              <select value={memberName} onChange={(e) => setMemberName(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", cursor: "pointer" }}>
                <option value="">Family</option>
                {memberOptions.map((member) => (
                  <option key={`${member.kind}-${member.name}`} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {recurrence && (
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.625rem", background: "rgba(99,102,241,0.06)", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
            {RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label} — {recurrence === "daily" ? "14 events" : recurrence === "weekly" ? "26 events" : "12 events"} will be created starting {date || "the selected date"}.
          </p>
        )}
        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !date} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() || !date ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() || !date ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : recurrence ? "Add Series" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  )
}
