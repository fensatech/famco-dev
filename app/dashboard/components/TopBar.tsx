"use client"
import { signOut } from "next-auth/react"
import { NAV, type Tab } from "../types"
import { NavIcon } from "./NavIcon"
import { todayLabel } from "../lib/date"
import type { HouseholdNotificationPreferences, Reminder } from "@/types"
import { NotificationBell } from "./NotificationBell"
import type { SystemNotice } from "../types"

export function TopBar({
  tab,
  isMobile = false,
  appVersion,
  systemNotices = [],
  reminders = [],
  notificationPreferences,
  notificationPermission = "default",
  onEnableDesktopNotifications,
  onDismissReminder,
  onSnoozeReminderOneHour,
  onSnoozeReminderTomorrow,
}: {
  tab: Tab
  isMobile?: boolean
  appVersion?: string
  systemNotices?: SystemNotice[]
  reminders?: Reminder[]
  notificationPreferences?: HouseholdNotificationPreferences
  notificationPermission?: NotificationPermission | "unsupported"
  onEnableDesktopNotifications?: () => Promise<void>
  onDismissReminder?: (id: string) => Promise<boolean>
  onSnoozeReminderOneHour?: (id: string) => Promise<boolean>
  onSnoozeReminderTomorrow?: (id: string) => Promise<boolean>
}) {
  const activeNav = NAV.find((n) => n.id === tab)!
  return (
    <header style={{ padding: "0.875rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
        <NavIcon id={activeNav.id} size={18} color={activeNav.color} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>{activeNav.label}</h1>
          {isMobile && appVersion && (
            <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: "0.12rem" }}>
              v{appVersion}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {onEnableDesktopNotifications && onDismissReminder && onSnoozeReminderOneHour && onSnoozeReminderTomorrow && (
          <NotificationBell
            systemNotices={systemNotices}
            reminders={reminders}
            preferences={notificationPreferences}
            permission={notificationPermission}
            onEnableDesktop={onEnableDesktopNotifications}
            onDismiss={onDismissReminder}
            onSnoozeOneHour={onSnoozeReminderOneHour}
            onSnoozeTomorrow={onSnoozeReminderTomorrow}
          />
        )}
        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{todayLabel()}</span>
        {isMobile && (
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              color: "var(--muted)",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0.35rem 0.65rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
