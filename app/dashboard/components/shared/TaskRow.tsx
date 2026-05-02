"use client"
import { useState } from "react"
import type { Task } from "@/lib/db"
import { EditTaskModal } from "../modals/EditTaskModal"
import type { TaskEditData } from "../modals/EditTaskModal"

function fmtDue(dueDate: string | null, dueTime: string | null): string | null {
  if (!dueDate) return null
  const d = new Date(dueDate + "T12:00")
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  if (!dueTime) return dateStr
  const [h, m] = dueTime.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${dateStr} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

interface Props {
  task: Task
  assigneeOptions?: string[]
  onToggle: (id: string, c: boolean) => void
  onDelete: (id: string) => void
  onEdit?: (id: string, data: TaskEditData) => Promise<boolean>
}

export function TaskRow({ task, assigneeOptions = [], onToggle, onDelete, onEdit }: Props) {
  const [showEdit, setShowEdit] = useState(false)
  const dueLabel = fmtDue(task.due_date, task.due_time)

  return (
    <>
      {showEdit && onEdit && (
        <EditTaskModal
          task={task}
          assigneeOptions={assigneeOptions}
          onSave={async (id, data) => {
            const ok = await onEdit(id, data)
            if (ok) setShowEdit(false)
            return ok
          }}
          onCancel={() => setShowEdit(false)}
        />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.625rem 0.875rem", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid var(--border)" }}>
        <button onClick={() => onToggle(task.id, !task.completed)} style={{ marginTop: "1px", width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0, border: task.completed ? "none" : "2px solid var(--border)", background: task.completed ? "linear-gradient(135deg,#6366f1,#c084fc)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {task.completed && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "0.875rem", textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "var(--muted)" : "var(--text)" }}>{task.title}</span>
          {dueLabel && !task.completed && (
            <div style={{ fontSize: "0.7rem", color: "#f472b6", marginTop: "0.15rem", fontWeight: 500 }}>📅 {dueLabel}</div>
          )}
          {!task.completed && (task.assignee_name || task.recurrence) && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {task.assignee_name && <span style={{ fontSize: "0.64rem", color: "#6366F1", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "999px", padding: "0.1rem 0.45rem", fontWeight: 700 }}>Assigned to {task.assignee_name}</span>}
              {task.recurrence && <span style={{ fontSize: "0.64rem", color: "#8B5CF6", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "999px", padding: "0.1rem 0.45rem", fontWeight: 700 }}>Repeats {task.recurrence}</span>}
            </div>
          )}
          {task.notes && !task.completed && (
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.15rem", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.notes}</div>
          )}
        </div>
        {onEdit && !task.completed && (
          <button onClick={() => setShowEdit(true)} title="Edit task" style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1, opacity: 0.6, flexShrink: 0 }}>✏️</button>
        )}
        <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "1.1rem", cursor: "pointer", padding: "0 0.2rem", lineHeight: 1, flexShrink: 0 }}>×</button>
      </div>
    </>
  )
}
