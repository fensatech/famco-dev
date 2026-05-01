"use client"
import { useState } from "react"
import type { Task } from "@/lib/db"
import { inputSt, fieldLabelStyle } from "../../styles"

export type TaskEditData = {
  title: string
  due_date: string | null
  due_time: string | null
  notes: string | null
}

interface Props {
  task: Task
  onSave: (id: string, data: TaskEditData) => Promise<boolean>
  onCancel: () => void
}

export function EditTaskModal({ task, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(task.title)
  const [dueDate, setDueDate] = useState(task.due_date ?? "")
  const [dueTime, setDueTime] = useState(task.due_time ?? "")
  const [notes, setNotes] = useState(task.notes ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const ok = await onSave(task.id, {
      title: title.trim(),
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (!ok) alert("Failed to save — please try again.")
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 350, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "rgba(255,255,255,0.99)", border: "1px solid rgba(244,114,182,0.4)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "440px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: "1.15rem" }}>✏️ Edit Task</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label style={fieldLabelStyle}>Task *</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && handleSave()}
              style={{ ...inputSt, marginTop: "0.3rem", fontSize: "0.95rem" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
            <div>
              <label style={fieldLabelStyle}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); if (!e.target.value) setDueTime("") }}
                style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark" }}
              />
            </div>
            <div>
              <label style={fieldLabelStyle}>Due Time</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                style={{ ...inputSt, marginTop: "0.3rem", colorScheme: "dark", opacity: dueDate ? 1 : 0.4, cursor: dueDate ? "text" : "not-allowed" }}
              />
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
        </div>

        <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.5rem" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "0.75rem", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()} style={{ flex: 2, padding: "0.75rem", borderRadius: "10px", background: saving || !title.trim() ? "rgba(244,114,182,0.3)" : "linear-gradient(135deg,#f472b6,#ec4899)", border: "none", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: saving || !title.trim() ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
