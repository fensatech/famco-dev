"use client"
import { useState } from "react"
import { inputSt, fieldLabelStyle } from "../../styles"

function currentDateValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function currentTimeValue() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

interface Props {
  assigneeOptions?: string[]
  onSave: (title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly") => void
  onCancel: () => void
  saving: boolean
}

export function AddTaskModal({ assigneeOptions = [], onSave, onCancel, saving }: Props) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState(currentDateValue)
  const [dueTime, setDueTime] = useState(currentTimeValue)
  const [notes, setNotes] = useState("")
  const [assigneeName, setAssigneeName] = useState("")
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly" | "">("")
  const [expanded, setExpanded] = useState(false)

  function handleSave() {
    if (!title.trim()) return
    onSave(title.trim(), dueDate || undefined, dueTime || undefined, notes.trim() || undefined, assigneeName || undefined, recurrence || undefined)
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(244,114,182,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>✅ Add Task</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label style={fieldLabelStyle}>Task *</label>
            <input
              autoFocus
              placeholder="e.g. Buy school supplies, Call dentist…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && !expanded && handleSave()}
              style={{ ...inputSt, marginTop: "0.3rem", fontSize: "0.95rem" }}
            />
          </div>

          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.78rem", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "'Inter',sans-serif" }}
            >
              + Add date, time, or notes
            </button>
          )}

          {expanded && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div>
                  <label style={fieldLabelStyle}>Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={fieldLabelStyle}>Due Time</label>
                  <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={!dueDate} style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark", opacity: dueDate ? 1 : 0.4, cursor: dueDate ? "text" : "not-allowed" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div>
                  <label style={fieldLabelStyle}>Assign To</label>
                  <select value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} style={{ ...inputSt, marginTop: "0.3rem" }}>
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabelStyle}>Repeats</label>
                  <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as "daily" | "weekly" | "monthly" | "")} style={{ ...inputSt, marginTop: "0.3rem" }}>
                    <option value="">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={fieldLabelStyle}>Notes</label>
                <textarea
                  placeholder="Optional notes…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ ...inputSt, marginTop: "0.3rem", resize: "vertical", minHeight: "60px", fontFamily: "'Inter',sans-serif" }}
                />
              </div>
              {dueDate && (
                <p style={{ fontSize: "0.72rem", color: "#f472b6", marginTop: "-0.25rem" }}>
                  Will appear in Calendar on {new Date(dueDate + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{dueTime ? ` at ${dueTime}` : ""}.
                </p>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() ? "rgba(244,114,182,0.3)" : "linear-gradient(135deg,#f472b6,#ec4899)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  )
}
