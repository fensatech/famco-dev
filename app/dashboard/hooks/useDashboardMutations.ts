"use client"
import { useState } from "react"
import type { Event, Task } from "@/lib/db"
import { todayStr } from "../lib/date"

interface Options {
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
}

export function useDashboardMutations({ setEvents, setTasks }: Options) {
  const [saving, setSaving] = useState(false)

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

  async function addTask(title: string, dueDate?: string, dueTime?: string, notes?: string): Promise<boolean> {
    setSaving(true)
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), due_date: dueDate || null, due_time: dueTime || null, notes: notes || null }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => [task, ...prev])
    }
    setSaving(false)
    return res.ok
  }

  async function editTask(id: string, data: { title: string; due_date: string | null; due_time: string | null; notes: string | null }): Promise<boolean> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks((prev) => prev.map((t) => t.id === id ? task : t))
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
      const { task } = await res.json()
      setTasks((prev) => prev.map((t) => t.id === id ? task : t).sort((a, b) => Number(a.completed) - Number(b.completed)))
    }
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    setTasks((prev) => prev.filter((t) => t.id !== id))
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
