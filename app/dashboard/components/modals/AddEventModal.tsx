"use client"
import { useState } from "react"
import { DEFAULT_REMINDER_OFFSET_MINUTES, getReminderOffsetLabel, REMINDER_OFFSET_OPTIONS, type ReminderOffsetMinutes } from "@/lib/reminders"
import type { CalendarMemberOption } from "../../types"
import { inputSt, fieldLabelStyle } from "../../styles"
import { todayStr } from "../../lib/date"

interface Props {
  onSave: (title: string, date: string, time: string | null, memberName?: string | null, reminderOffsetMinutes?: ReminderOffsetMinutes) => void
  onCancel: () => void
  saving: boolean
  initialDate?: string
  memberOptions?: CalendarMemberOption[]
}

export function AddEventModal({ onSave, onCancel, saving, initialDate, memberOptions = [] }: Props) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(initialDate ?? todayStr())
  const [time, setTime] = useState("")
  const [memberName, setMemberName] = useState("")
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<ReminderOffsetMinutes>(DEFAULT_REMINDER_OFFSET_MINUTES)

  function handleSave() {
    if (!title.trim() || !date) return
    onSave(title.trim(), date, time || null, memberName || null, reminderOffsetMinutes)
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
        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !date} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() || !date ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#c084fc)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() || !date ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : "Add Event"}
          </button>
        </div>
      </div>
    </div>
  )
}
