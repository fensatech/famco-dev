"use client"

import { useMemo, useState } from "react"
import type { Reminder } from "@/types"

interface Props {
  reminders: Reminder[]
  permission: NotificationPermission | "unsupported"
  onEnableDesktop: () => Promise<void>
  onDismiss: (id: string) => Promise<boolean>
  onSnoozeOneHour: (id: string) => Promise<boolean>
  onSnoozeTomorrow: (id: string) => Promise<boolean>
}

function formatReminderWhen(value: string): string {
  const date = new Date(value)
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getReminderBuckets(reminders: Reminder[]) {
  const now = new Date()
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const dueNow = reminders.filter((reminder) => new Date(reminder.remind_at).getTime() <= now.getTime())
  const laterToday = reminders.filter((reminder) => {
    const time = new Date(reminder.remind_at).getTime()
    return time > now.getTime() && time <= todayEnd.getTime()
  })
  const upcoming = reminders.filter((reminder) => new Date(reminder.remind_at).getTime() > todayEnd.getTime())
  return { dueNow, laterToday, upcoming }
}

export function NotificationBell({
  reminders,
  permission,
  onEnableDesktop,
  onDismiss,
  onSnoozeOneHour,
  onSnoozeTomorrow,
}: Props) {
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const buckets = useMemo(() => getReminderBuckets(reminders), [reminders])
  const hasDueNow = buckets.dueNow.length > 0

  async function handleDismiss(id: string) {
    setBusyId(id)
    await onDismiss(id)
    setBusyId(null)
  }

  async function handleSnoozeOneHour(id: string) {
    setBusyId(id)
    await onSnoozeOneHour(id)
    setBusyId(null)
  }

  async function handleSnoozeTomorrow(id: string) {
    setBusyId(id)
    await onSnoozeTomorrow(id)
    setBusyId(null)
  }

  const permissionLabel =
    permission === "granted"
      ? "Desktop alerts on"
      : permission === "denied"
        ? "Desktop alerts blocked"
        : permission === "unsupported"
          ? "Desktop alerts unavailable"
          : "Enable desktop alerts"

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          position: "relative",
          width: "38px",
          height: "38px",
          borderRadius: "999px",
          border: "1px solid var(--border)",
          background: hasDueNow ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.7)",
          color: hasDueNow ? "#8B5CF6" : "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
        }}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 006 0" />
        </svg>
        {reminders.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              borderRadius: "999px",
              background: hasDueNow ? "#ef4444" : "#8B5CF6",
              color: "#fff",
              fontSize: "0.6rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 0.25rem",
            }}
          >
            {reminders.length > 99 ? "99+" : reminders.length}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.6rem)",
            right: 0,
            width: "min(420px, calc(100vw - 2rem))",
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            boxShadow: "0 18px 50px rgba(15,23,42,0.14)",
            padding: "1rem",
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", fontFamily: "'Outfit',sans-serif" }}>
                Notifications
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {permissionLabel}
              </div>
            </div>
            {permission !== "granted" && permission !== "unsupported" && (
              <button
                onClick={() => void onEnableDesktop()}
                style={{
                  border: "1px solid rgba(99,102,241,0.18)",
                  borderRadius: "999px",
                  background: "rgba(99,102,241,0.08)",
                  color: "#6366F1",
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                Enable alerts
              </button>
            )}
          </div>

          {reminders.length === 0 ? (
            <div
              style={{
                borderRadius: "14px",
                border: "1px dashed var(--border)",
                padding: "1.25rem 1rem",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.8rem",
              }}
            >
              No active notifications right now.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "420px", overflowY: "auto", paddingRight: "0.15rem" }}>
              {[
                { label: "Due now", items: buckets.dueNow, accent: "#ef4444" },
                { label: "Later today", items: buckets.laterToday, accent: "#f59e0b" },
                { label: "Upcoming", items: buckets.upcoming, accent: "#6366F1" },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div key={group.label}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: group.accent, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.45rem" }}>
                      {group.label}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                      {group.items.map((reminder) => (
                        <div
                          key={reminder.id}
                          style={{
                            borderRadius: "14px",
                            border: `1px solid ${group.accent}22`,
                            background: `${group.accent}0f`,
                            padding: "0.8rem 0.85rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{reminder.title}</div>
                              <div style={{ fontSize: "0.7rem", color: group.accent, marginTop: "0.18rem", fontWeight: 600 }}>
                                {formatReminderWhen(reminder.remind_at)}
                              </div>
                              {reminder.note && (
                                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                                  {reminder.note}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginTop: "0.55rem" }}>
                            <button
                              onClick={() => void handleSnoozeOneHour(reminder.id)}
                              disabled={busyId === reminder.id}
                              style={{
                                borderRadius: "8px",
                                border: "1px solid rgba(99,102,241,0.18)",
                                background: "rgba(99,102,241,0.08)",
                                color: "#6366F1",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "0.25rem 0.55rem",
                                cursor: busyId === reminder.id ? "default" : "pointer",
                                fontFamily: "'Inter',sans-serif",
                              }}
                            >
                              Snooze 1 hour
                            </button>
                            <button
                              onClick={() => void handleSnoozeTomorrow(reminder.id)}
                              disabled={busyId === reminder.id}
                              style={{
                                borderRadius: "8px",
                                border: "1px solid rgba(139,92,246,0.18)",
                                background: "rgba(139,92,246,0.08)",
                                color: "#8B5CF6",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "0.25rem 0.55rem",
                                cursor: busyId === reminder.id ? "default" : "pointer",
                                fontFamily: "'Inter',sans-serif",
                              }}
                            >
                              Tomorrow 9 AM
                            </button>
                            <button
                              onClick={() => void handleDismiss(reminder.id)}
                              disabled={busyId === reminder.id}
                              style={{
                                borderRadius: "8px",
                                border: "1px solid rgba(15,23,42,0.1)",
                                background: "rgba(255,255,255,0.65)",
                                color: "var(--muted)",
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                padding: "0.25rem 0.55rem",
                                cursor: busyId === reminder.id ? "default" : "pointer",
                                fontFamily: "'Inter',sans-serif",
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
