"use client"
import { useState } from "react"
import type { Event, Task } from "@/lib/db"
import type { Reminder } from "@/types"
import { todayStr } from "../lib/date"

interface Options {
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>
}

export function useDashboardMutations({ setEvents, setTasks, setReminders }: Options) {
  const [saving, setSaving] = useState(false)

  async function refreshReminders() {
    const res = await fetch("/api/reminders")
    if (!res.ok) return
    const { reminders } = await res.json()
    if (Array.isArray(reminders)) {
      setReminders(reminders)
    }
  }

  async function addEvent(title: string, date: string, time: string | null): Promise<boolean> {
    setSaving(true)
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), event_date: date || todayStr(), start_time: time || null }),
    })
    if (res.ok) {
      const { event } = await res.json()
      setEvents((prev) => [...prev, event].sort((a, b) => {
        if (a.event_date !== b.event_date) return (a.event_date ?? "") < (b.event_date ?? "") ? -1 : 1
        return (a.start_time ?? "99:99") < (b.start_time ?? "99:99") ? -1 : 1
      }))
    }
    setSaving(false)
    return res.ok
  }

  async function addTask(title: string, dueDate?: string, dueTime?: string, notes?: string, assigneeName?: string, recurrence?: "daily" | "weekly" | "monthly"): Promise<boolean> {
    setSaving(true)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        due_date: dueDate || null,
        due_time: dueTime || null,
        notes: notes || null,
        assignee_name: assigneeName || null,
        recurrence: recurrence || null,
      }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => [task, ...prev])
      await refreshReminders()
    }
    setSaving(false)
    return res.ok
  }

  async function editTask(id: string, data: { title: string; due_date: string | null; due_time: string | null; notes: string | null; assignee_name: string | null; recurrence: "daily" | "weekly" | "monthly" | null }): Promise<boolean> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => prev.map((t) => t.id === id ? task : t))
      await refreshReminders()
    }
    return res.ok
  }

  async function toggleTask(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    })
    if (res.ok) {
      const { task, spawnedTask } = await res.json()
      setTasks((prev) => {
        const next = prev.map((t) => t.id === id ? task : t)
        return (spawnedTask ? [spawnedTask, ...next] : next).sort((a, b) => Number(a.completed) - Number(b.completed))
      })
      await refreshReminders()
    }
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await refreshReminders()
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" })
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  async function updateEvent(id: string, data: Partial<Event>) {
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const { event } = await res.json()
      setEvents((prev) => prev.map((e) => e.id === id ? event : e))
    }
  }

  return { saving, addEvent, addTask, editTask, toggleTask, deleteTask, deleteEvent, updateEvent }
}
