"use client"
import { useState, useEffect } from "react"
import type { ReminderOffsetMinutes } from "@/lib/reminders"
import type { Task } from "@/lib/db"
import type { TaskEditData } from "../components/modals/EditTaskModal"
import { savePillStyle } from "../styles"
import { AddTaskModal } from "../components/modals/AddTaskModal"
import { TaskRow } from "../components/shared/TaskRow"

interface Props {
  pending: Task[]
  done: Task[]
  assigneeOptions: string[]
  onAddTask: (title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly", reminderOffsetMinutes?: ReminderOffsetMinutes) => Promise<boolean>
  onEditTask: (id: string, data: TaskEditData) => Promise<boolean>
  onToggleTask: (id: string, completed: boolean) => void
  onDeleteTask: (id: string) => void
  saving: boolean
  openSignal?: number
  readOnly?: boolean
}

export function TasksTab({ pending, done, assigneeOptions, onAddTask, onEditTask, onToggleTask, onDeleteTask, saving, openSignal, readOnly = false }: Props) {
  const [showAddTask, setShowAddTask] = useState(false)

  useEffect(() => {
    if (openSignal && !readOnly) { queueMicrotask(() => setShowAddTask(true)) }
  }, [openSignal, readOnly])

  async function handleAddTask(title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly", reminderOffsetMinutes?: ReminderOffsetMinutes) {
    const ok = await onAddTask(title, dueDate, dueTime, notes, assigneeName, recurrence, reminderOffsetMinutes)
    if (ok) setShowAddTask(false)
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.2rem" }}>Tasks & Chores</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Shared to-dos, chores, and reminders for your household</p>
        </div>
        <button onClick={() => !readOnly && setShowAddTask(true)} disabled={readOnly} style={{ ...savePillStyle, flexShrink: 0, opacity: readOnly ? 0.55 : 1, cursor: readOnly ? "not-allowed" : "pointer" }}>+ Add task</button>
      </div>
      {readOnly && (
        <div style={{ marginBottom: "1rem", borderRadius: "14px", padding: "0.85rem 0.95rem", border: "1px solid rgba(99,102,241,0.18)", background: "rgba(99,102,241,0.08)", color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.55 }}>
          You can view household tasks here, but only adults, co-parents, or the owner can add, edit, complete, or remove them.
        </div>
      )}
      {showAddTask && <AddTaskModal assigneeOptions={assigneeOptions} onSave={handleAddTask} onCancel={() => setShowAddTask(false)} saving={saving} />}
      <div style={{ maxWidth: "600px" }}>
        {pending.length === 0 && done.length === 0 && (
          <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)", background: "rgba(255,255,255,0.02)", borderRadius: "14px", border: "1px dashed var(--border)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✅</div>
            <p style={{ fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.9rem", color: "var(--text)" }}>All caught up!</p>
            <p style={{ fontSize: "0.8rem", lineHeight: 1.55 }}>Add a chore, reminder, or shared to-do to keep your household on track.</p>
          </div>
        )}
        {pending.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {pending.map((t) => <TaskRow key={t.id} task={t} assigneeOptions={assigneeOptions} onToggle={onToggleTask} onDelete={onDeleteTask} onEdit={onEditTask} readOnly={readOnly} />)}
          </div>
        )}
        {done.length > 0 && (
          <>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Completed</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {done.map((t) => <TaskRow key={t.id} task={t} assigneeOptions={assigneeOptions} onToggle={onToggleTask} onDelete={onDeleteTask} readOnly={readOnly} />)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
