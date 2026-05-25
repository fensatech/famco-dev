"use client"
import { useState, useEffect } from "react"
import type { Event, Task } from "@/lib/db"
import type { FamilyFact, FamilyInvite, HouseholdMember, HouseholdNotificationPreferences, Reminder, ScannedEventAction } from "@/types"
import { canEditHousehold, canManageBilling, canManageCoParenting, canManageDocuments, canManageExpenses, canManageSharedCalendar, canManageTasks } from "@/lib/permissions"
import { isWithinQuietHours, normalizeReminderOffsetMinutes } from "@/lib/reminders"
import type { DashboardShellProps, Tab, DocumentRow, GCalEvent, KidRow, PetRow, ScannedEventRow } from "./types"
import { useSessionTimeout } from "./hooks/useSessionTimeout"
import { useInsightsRefresh } from "./hooks/useInsightsRefresh"
import { useDashboardMutations } from "./hooks/useDashboardMutations"
import { SidebarNav } from "./components/SidebarNav"
import { TopBar } from "./components/TopBar"
import { FabMenu } from "./components/FabMenu"
import { MobileNav } from "./components/MobileNav"
import { HomeTab } from "./tabs/HomeTab"
import { CalendarTab } from "./tabs/CalendarTab"
import { TasksTab } from "./tabs/TasksTab"
import { InsightsTab } from "./tabs/InsightsTab"
import { DataMapTab } from "./tabs/DataMapTab"
import { ExpensesTab } from "./tabs/ExpensesTab"
import { DocumentsTab } from "./tabs/DocumentsTab"
import { SettingsTab } from "./tabs/SettingsTab"
import { CoParentingTab } from "./tabs/CoParentingTab"
import { BillingTab } from "./tabs/BillingTab"
import type { CalendarMemberOption, CoParentingSchedule, CoParentingOverride, CoParentingSwapRequest, SystemNotice } from "./types"
import { memberColor } from "./lib/events"
import { getHouseholdSetupStatus } from "./lib/setup"

function formatNoticeTime(value: string): string {
  const date = new Date(value)
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function DashboardShell({ currentProfileId: _currentProfileId, currentUserFirstName, currentHouseholdRole, notificationPreferences: initialNotificationPreferences, profile: initialProfile, billing, kids: initialKids, pets: initialPets, provider, events: initialEvents, tasks: initialTasks, scannedEvents: initialScannedEvents, facts: initialFacts, documents: initialDocuments, invites: initialInvites, householdMembers: initialHouseholdMembers, insightActions: initialInsightActions, reminders: initialReminders, lastInboxSyncAt: initialLastInboxSyncAt, lastManualInboxScanAt: initialLastManualInboxScanAt, appVersion, isAdmin }: DashboardShellProps) {
  void _currentProfileId
  const [tab, setTab] = useState<Tab>("home")
  const [profile, setProfile] = useState(initialProfile)
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [kids, setKids] = useState<KidRow[]>(initialKids)
  const [pets, setPets] = useState<PetRow[]>(initialPets)
  const [scannedEvents, setScannedEvents] = useState<ScannedEventRow[]>(initialScannedEvents)
  const [facts, setFacts] = useState<FamilyFact[]>(initialFacts)
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments)
  const [invites, setInvites] = useState<FamilyInvite[]>(initialInvites)
  const [householdMembers] = useState<HouseholdMember[]>(initialHouseholdMembers)
  const [insightActions, setInsightActions] = useState<ScannedEventAction[]>(initialInsightActions)
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [notificationPreferences, setNotificationPreferences] = useState<HouseholdNotificationPreferences>(initialNotificationPreferences)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
    return Notification.permission
  })
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalLoaded, setGcalLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [addEventSignal, setAddEventSignal] = useState(0)
  const [addTaskSignal, setAddTaskSignal] = useState(0)
  const [coparentingSchedule, setCoparentingSchedule] = useState<CoParentingSchedule | null>(null)
  const [coparentingOverrides, setCoparentingOverrides] = useState<CoParentingOverride[]>([])
  const [coparentingRequests, setCoparentingRequests] = useState<CoParentingSwapRequest[]>([])
  const [coparentingLoaded, setCoparentingLoaded] = useState(false)

  const canEditHouseholdData = canEditHousehold(currentHouseholdRole)
  const canManageSharedData = canManageSharedCalendar(currentHouseholdRole)
  const canManageTaskData = canManageTasks(currentHouseholdRole)
  const canManageDocumentData = canManageDocuments(currentHouseholdRole)
  const canManageExpenseData = canManageExpenses(currentHouseholdRole)
  const canManageCoparentingData = canManageCoParenting(currentHouseholdRole)
  const canManageBillingData = canManageBilling(currentHouseholdRole)
  const householdSetup = getHouseholdSetupStatus(profile, kids, pets)

  useEffect(() => {
    function resetDashboardState() {
      setTab("home")
      setAddEventSignal(0)
      setAddTaskSignal(0)
      try {
        sessionStorage.removeItem("famco_initial_sync_done")
      } catch {}
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }))
    }

    function handlePageShow(event: PageTransitionEvent) {
      const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
      if (event.persisted || navigationEntry?.type === "back_forward") {
        resetDashboardState()
      }
    }

    function handlePageHide() {
      try {
        sessionStorage.removeItem("famco_initial_sync_done")
      } catch {}
    }

    window.addEventListener("pageshow", handlePageShow)
    window.addEventListener("pagehide", handlePageHide)
    return () => {
      window.removeEventListener("pageshow", handlePageShow)
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  useEffect(() => {
    let mounted = true

    async function refreshReminders() {
      try {
        const res = await fetch("/api/reminders")
        if (!res.ok) return
        const { reminders: nextReminders } = await res.json()
        if (!mounted || !Array.isArray(nextReminders)) return
        setReminders(nextReminders)
      } catch {}
    }

    void refreshReminders()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshReminders()
      }
    }, 60000)

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshReminders()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    return () => {
      mounted = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (notificationPermission !== "granted" || !notificationPreferences.browser_enabled || typeof window === "undefined") return
    if (
      notificationPreferences.quiet_hours_enabled &&
      isWithinQuietHours(new Date(), notificationPreferences.quiet_hours_start, notificationPreferences.quiet_hours_end)
    ) {
      return
    }
    const now = Date.now()
    for (const reminder of reminders) {
      const remindAt = new Date(reminder.remind_at).getTime()
      if (Number.isNaN(remindAt) || remindAt > now) continue
      const deliveredKey = `famco_notification_shown_${reminder.id}`
      if (sessionStorage.getItem(deliveredKey)) continue
      try {
        new Notification(reminder.title, {
          body: reminder.note ?? "A Famco reminder is ready for you.",
          tag: reminder.id,
        })
        sessionStorage.setItem(deliveredKey, "1")
      } catch {}
    }
  }, [notificationPermission, notificationPreferences, reminders])

  useEffect(() => {
    fetch("/api/coparenting")
      .then((r) => r.ok ? r.json() : { schedule: null, overrides: [] })
      .then(({ schedule, overrides, swapRequests }) => {
        setCoparentingSchedule(schedule ?? null)
        setCoparentingOverrides(overrides ?? [])
        setCoparentingRequests(swapRequests ?? [])
        setCoparentingLoaded(true)
      })
      .catch(() => setCoparentingLoaded(true))
  }, [])

  async function saveCoparentingSchedule(data: Omit<CoParentingSchedule, "id" | "profile_id" | "active" | "created_at">): Promise<boolean> {
    const r = await fetch("/api/coparenting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!r.ok) return false
    const { schedule: s, overrides: o, swapRequests } = await r.json()
    setCoparentingSchedule(s)
    setCoparentingOverrides(o ?? [])
    setCoparentingRequests(swapRequests ?? [])
    return true
  }

  async function addCoparentingOverride(scheduleId: string, data: { override_date: string; assigned_to: string; note: string | null }): Promise<boolean> {
    const r = await fetch("/api/coparenting/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schedule_id: scheduleId, ...data }) })
    if (!r.ok) return false
    const { override } = await r.json()
    setCoparentingOverrides((prev) => [...prev.filter((o) => o.override_date !== override.override_date), override].sort((a, b) => a.override_date.localeCompare(b.override_date)))
    return true
  }

  async function deleteCoparentingOverride(id: string): Promise<void> {
    await fetch(`/api/coparenting/overrides/${id}`, { method: "DELETE" })
    setCoparentingOverrides((prev) => prev.filter((o) => o.id !== id))
  }

  async function createCoparentingSwapRequest(data: {
    requested_date: string
    requested_by: "a" | "b"
    requested_to: "a" | "b"
    note: string | null
  }): Promise<boolean> {
    if (!coparentingSchedule) return false
    const r = await fetch("/api/coparenting/swap-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_id: coparentingSchedule.id, ...data }),
    })
    if (!r.ok) return false
    const { request } = await r.json()
    setCoparentingRequests((prev) => [request, ...prev])
    return true
  }

  async function resolveCoparentingSwapRequest(
    id: string,
    status: "approved" | "declined",
    decisionNote?: string | null,
  ): Promise<boolean> {
    const r = await fetch(`/api/coparenting/swap-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, decision_note: decisionNote ?? null }),
    })
    if (!r.ok) return false
    const { request, overrides } = await r.json()
    setCoparentingRequests((prev) => prev.map((item) => item.id === id ? request : item))
    if (Array.isArray(overrides)) {
      setCoparentingOverrides(overrides)
    }
    return true
  }

  async function saveNotificationPreferences(
    updates: Partial<Pick<
      HouseholdNotificationPreferences,
      | "browser_enabled"
      | "quiet_hours_enabled"
      | "quiet_hours_start"
      | "quiet_hours_end"
      | "default_event_offset_minutes"
      | "default_task_offset_minutes"
      | "default_school_offset_minutes"
      | "default_bill_offset_minutes"
      | "default_coparenting_offset_minutes"
    >>,
  ): Promise<boolean> {
    const r = await fetch("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    if (!r.ok) return false
    const { preferences } = await r.json()
    setNotificationPreferences(preferences)
    return true
  }

  const { showWarning, dismiss } = useSessionTimeout()
  const { refreshInsights, lastSyncAt, manualScanCooldownUntil, nextAutoSyncAt } = useInsightsRefresh({
    provider,
    canAutoSync: householdSetup.readyForInboxSync,
    setupSummary: householdSetup.summary,
    initialInsightsCount: scannedEvents.length,
    initialLastScanAt: initialLastInboxSyncAt,
    initialLastManualScanAt: initialLastManualInboxScanAt,
    onScannedEventsUpdate: setScannedEvents,
    onFactsUpdate: setFacts,
  })
  const { saving, addEvent, addTask, editTask, toggleTask, deleteTask, deleteEvent, updateEvent } = useDashboardMutations({
    setEvents,
    setTasks,
    setReminders,
    defaultEventOffsetMinutes: normalizeReminderOffsetMinutes(notificationPreferences.default_event_offset_minutes),
    defaultTaskOffsetMinutes: normalizeReminderOffsetMinutes(notificationPreferences.default_task_offset_minutes),
  })

  const pending = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)
  const activeReminders = reminders.filter((r) => r.status === "pending")
  const showBillingBanner = billing.status !== "active" && (billing.status !== "trial" || billing.daysRemaining <= 14)
  const assigneeOptions = [
    ...householdMembers.map((member) => [member.first_name, member.last_name].filter(Boolean).join(" ")),
    ...kids.map((kid) => kid.name),
  ].map((name) => name.trim()).filter(Boolean).filter((name, index, list) => list.indexOf(name) === index)
  const profileAdultName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim()
  const spouseName = [profile.spouseFirstName, profile.spouseLastName].filter(Boolean).join(" ").trim()
  const adultMemberNames = [
    profileAdultName,
    ...householdMembers.map((member) => [member.first_name, member.last_name].filter(Boolean).join(" ").trim()),
  ]
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
  const petMemberNames = pets.map((pet) => pet.name.trim()).filter(Boolean)
  const calendarMemberOptions: CalendarMemberOption[] = [
    ...adultMemberNames.map((name, index) => ({
      name,
      shortLabel: name.split(" ")[0] || name,
      color: index === 0 ? "#818cf8" : "#f472b6",
      kind: "adult" as const,
    })),
    ...(spouseName && !adultMemberNames.some((name) => name.toLowerCase() === spouseName.toLowerCase()) ? [{
      name: spouseName,
      shortLabel: spouseName.split(" ")[0] || spouseName,
      color: "#f472b6",
      kind: "adult" as const,
    }] : []),
    ...kids.map((kid, index) => ({
      name: kid.name,
      shortLabel: kid.firstName ?? kid.name.split(" ")[0] ?? kid.name,
      color: memberColor(index + 1),
      kind: "child" as const,
    })),
    ...petMemberNames.map((name) => ({
      name,
      shortLabel: name.split(" ")[0] || name,
      color: "#fbbf24",
      kind: "pet" as const,
    })),
  ].filter((member, index, list) => list.findIndex((item) => item.name.toLowerCase() === member.name.toLowerCase()) === index)
  const todayEvents = events.filter((e) => {
    const today = new Date().toISOString().split("T")[0]
    return e.event_date === today
  })
  const systemNotices: SystemNotice[] = []
  if (!householdSetup.readyForInboxSync) {
    systemNotices.push({
      id: "setup-required",
      title: "Complete Manage Family before inbox sync",
      detail: `Famco needs you to ${householdSetup.summary} for better email matching before it can sync Insights automatically.`,
      tone: "warning",
    })
  } else if (manualScanCooldownUntil) {
    systemNotices.push({
      id: "scan-cooldown",
      title: "Manual inbox scan is on cooldown",
      detail: `Last checked ${lastSyncAt ? formatNoticeTime(lastSyncAt) : "recently"}. Manual scans are available again after ${formatNoticeTime(manualScanCooldownUntil)}; the next quiet check is ${nextAutoSyncAt ? formatNoticeTime(nextAutoSyncAt) : "scheduled automatically"}.`,
      tone: "info",
    })
  }

  async function createInvite(data: { invitee_email: string; invited_name?: string; relation: string; role: string }) {
    const res = await fetch("/api/family/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return false
    const { invite } = await res.json()
    setInvites((prev) => [invite, ...prev])
    const refreshMembers = await fetch("/api/family/invites")
    if (refreshMembers.ok) {
      setInvites((await refreshMembers.json()).invites ?? [])
    }
    return true
  }

  async function revokeInvite(id: string) {
    const res = await fetch(`/api/family/invites/${id}`, { method: "DELETE" })
    if (!res.ok) return false
    setInvites((prev) => prev.map((invite) => invite.id === id ? { ...invite, status: "revoked" } : invite))
    return true
  }

  async function updateInsightAction(
    scannedEventId: string,
    data: {
      status?: "new" | "handled"
      assigned_to?: string | null
      last_action?: "calendar" | "task" | "reminder" | "handled" | null
      corrected_member_name?: string | null
      corrected_member_type?: "adult" | "child" | "pet" | "family" | null
      corrected_event_type?: ScannedEventRow["event_type"] | null
      relevance?: "relevant" | "not_relevant" | "needs_review"
    },
  ) {
    const res = await fetch("/api/insights/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanned_event_id: scannedEventId, ...data }),
    })
    if (!res.ok) return false
    const { action } = await res.json()
    setInsightActions((prev) => {
      const filtered = prev.filter((item) => item.scanned_event_id !== scannedEventId)
      return [action, ...filtered]
    })
    return true
  }

  async function addReminder(data: { source_type: Reminder["source_type"]; source_id?: string | null; title: string; note?: string | null; remind_at: string }) {
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) return false
    const { reminder } = await res.json()
    setReminders((prev) => [...prev.filter((r) => r.id !== reminder.id && !(r.source_type === reminder.source_type && r.source_id === reminder.source_id)), reminder].sort((a, b) => a.remind_at.localeCompare(b.remind_at)))
    return true
  }

  async function dismissReminderAction(id: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    })
    if (!res.ok) return false
    setReminders((prev) => prev.filter((r) => r.id !== id))
    return true
  }

  async function snoozeReminderAction(id: string, remindAt: string) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snooze", remind_at: remindAt }),
    })
    if (!res.ok) return false
    const { reminder } = await res.json()
    setReminders((prev) => prev.map((r) => r.id === id ? reminder : r).sort((a, b) => a.remind_at.localeCompare(b.remind_at)))
    return true
  }

  async function enableDesktopNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported")
      return
    }
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    if (permission === "granted" && !notificationPreferences.browser_enabled) {
      void saveNotificationPreferences({ browser_enabled: true })
    }
  }

  async function snoozeReminderOneHourAction(id: string) {
    const next = new Date()
    next.setHours(next.getHours() + 1, 0, 0, 0)
    return snoozeReminderAction(id, next.toISOString())
  }

  async function snoozeReminderTomorrowAction(id: string) {
    const next = new Date()
    next.setDate(next.getDate() + 1)
    next.setHours(9, 0, 0, 0)
    return snoozeReminderAction(id, next.toISOString())
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

      {/* Inactivity warning */}
      {showWarning && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(251,191,36,0.12)", borderBottom: "1px solid rgba(251,191,36,0.4)", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(8px)" }}>
          <span style={{ fontSize: "0.85rem", color: "#fbbf24" }}>⏱ You&apos;ve been inactive for 25 minutes — you&apos;ll be signed out in 5 minutes.</span>
          <button onClick={dismiss} style={{ background: "none", border: "none", color: "#fbbf24", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, padding: "0 0.25rem" }}>×</button>
        </div>
      )}

      {/* Sidebar (desktop) */}
      {!isMobile && (
        <SidebarNav tab={tab} onTab={setTab} scannedCount={scannedEvents.length} pendingTaskCount={pending.length} appVersion={appVersion} showAdminLink={isAdmin} />
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar
          tab={tab}
          isMobile={isMobile}
          appVersion={appVersion}
          systemNotices={systemNotices}
          reminders={activeReminders}
          notificationPreferences={notificationPreferences}
          notificationPermission={notificationPermission}
          onEnableDesktopNotifications={enableDesktopNotifications}
          onDismissReminder={dismissReminderAction}
          onSnoozeReminderOneHour={snoozeReminderOneHourAction}
          onSnoozeReminderTomorrow={snoozeReminderTomorrowAction}
        />

        <main style={{ flex: 1, padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", paddingBottom: isMobile ? "5.5rem" : "5rem", overflowY: "auto" }}>
          {showBillingBanner && tab !== "billing" && (
            <div style={{ marginBottom: "1rem", borderRadius: "16px", padding: "1rem 1.1rem", border: "1px solid rgba(20,184,166,0.22)", background: billing.status === "grace" ? "rgba(251,191,36,0.12)" : "rgba(20,184,166,0.09)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: billing.status === "grace" ? "#f59e0b" : "#14b8a6", marginBottom: "0.18rem" }}>
                    {billing.status === "trial"
                      ? `${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left in your free trial`
                      : billing.status === "grace"
                        ? `Grace week preview: ${billing.daysRemaining} day${billing.daysRemaining === 1 ? "" : "s"} left`
                        : "Subscription access preview"}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
                    {billing.enforcementEnabled
                      ? "When the trial ends, syncing stops first. After the 7-day grace period, logins stop and household data becomes eligible for permanent deletion."
                      : "Preview only while you test Famco: PayPal billing is not enforced yet, but this is the timeline your household will follow when subscriptions go live."}
                  </div>
                </div>
                <button
                  onClick={() => setTab("billing")}
                  style={{ border: "none", borderRadius: "999px", background: "linear-gradient(135deg,#14b8a6,#0ea5e9)", color: "#fff", padding: "0.55rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", fontFamily: "inherit" }}
                >
                  Open Billing
                </button>
              </div>
            </div>
          )}

          {!canEditHouseholdData && (
            <div style={{ marginBottom: "1rem", borderRadius: "16px", padding: "0.95rem 1.05rem", border: "1px solid rgba(129,140,248,0.22)", background: "rgba(129,140,248,0.08)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#6366f1", marginBottom: "0.15rem" }}>
                Shared household access
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.55 }}>
                Your current role is <strong style={{ color: "var(--text)" }}>{currentHouseholdRole.replace("_", " ")}</strong>. You can view the household, but editing family settings, documents, schedules, and billing is limited to adults, co-parents, or the household owner.
              </div>
            </div>
          )}

          {tab === "home" && (
            <HomeTab
              firstName={currentUserFirstName || profile.firstName}
              kids={kids}
              events={todayEvents}
              pendingTasks={pending}
              setupChecklist={householdSetup.checklist}
              setupSummary={householdSetup.summary}
              memberOptions={calendarMemberOptions}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onDeleteEvent={deleteEvent}
              saving={saving}
              totalTasks={tasks.length}
              onNavigate={setTab}
              coparentingSchedule={coparentingSchedule}
              coparentingOverrides={coparentingOverrides}
              reminders={activeReminders}
              assigneeOptions={assigneeOptions}
              onDismissReminder={dismissReminderAction}
              onSnoozeReminder={snoozeReminderAction}
              readOnly={!canManageSharedData}
            />
          )}

          {tab === "calendar" && (
            <CalendarTab
              events={events}
              tasks={tasks}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
              onAddEvent={addEvent}
              saving={saving}
              provider={provider}
              memberOptions={calendarMemberOptions}
              scannedEvents={scannedEvents}
              gcalEvents={gcalEvents}
              setGcalEvents={setGcalEvents}
              gcalLoaded={gcalLoaded}
              setGcalLoaded={setGcalLoaded}
              onEventsRefresh={setEvents}
              onOpenBilling={() => setTab("billing")}
              openSignal={addEventSignal}
              coparentingSchedule={coparentingSchedule}
              coparentingOverrides={coparentingOverrides}
              readOnly={!canManageSharedData}
            />
          )}

          {tab === "tasks" && (
            <TasksTab
              pending={pending}
              done={done}
              assigneeOptions={assigneeOptions}
              onAddTask={addTask}
              onEditTask={editTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              saving={saving}
              openSignal={addTaskSignal}
              readOnly={!canManageTaskData}
            />
          )}

          {tab === "insights" && (
            <InsightsTab
              scannedEvents={scannedEvents}
              insightActions={insightActions}
              assigneeOptions={assigneeOptions}
              provider={provider}
              canScanInbox={householdSetup.readyForInboxSync}
              setupSummary={householdSetup.summary}
              lastSyncAt={lastSyncAt}
              nextAutoSyncAt={nextAutoSyncAt}
              manualScanCooldownUntil={manualScanCooldownUntil}
              onOpenSetup={() => setTab("settings")}
              onOpenBilling={() => setTab("billing")}
              onRefresh={refreshInsights}
              onAddEvent={addEvent}
              onAddTask={addTask}
              onAddReminder={addReminder}
              onUpdateAction={updateInsightAction}
              memberOptions={calendarMemberOptions}
              role={currentHouseholdRole}
              reminderDefaults={notificationPreferences}
            />
          )}

          {tab === "data" && (
            <DataMapTab
              profile={profile}
              kids={kids}
              facts={facts}
              scannedEvents={scannedEvents}
              onDeleteFact={async (id) => {
                const response = await fetch("/api/facts", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                })
                if (!response.ok) return false
                setFacts((prev) => prev.filter((f) => f.id !== id))
                return true
              }}
              onUpdateFact={async (id, object) => {
                const response = await fetch("/api/facts", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, object }),
                })
                if (!response.ok) return false
                setFacts((prev) => prev.map((f) => f.id === id ? { ...f, object, status: "confirmed" as const } : f))
                return true
              }}
            />
          )}

          {tab === "expenses" && (
            <ExpensesTab scannedEvents={scannedEvents} canManageExpenses={canManageExpenseData} />
          )}

          {tab === "documents" && (
            <DocumentsTab
              documents={documents}
              memberOptions={calendarMemberOptions}
              onDocumentsChange={setDocuments}
              canManageDocuments={canManageDocumentData}
            />
          )}

          {tab === "coparenting" && (
            <CoParentingTab
              kids={kids}
              schedule={coparentingSchedule}
              overrides={coparentingOverrides}
              loaded={coparentingLoaded}
              onSaveSchedule={saveCoparentingSchedule}
              onAddOverride={addCoparentingOverride}
              onDeleteOverride={deleteCoparentingOverride}
              swapRequests={coparentingRequests}
              onCreateSwapRequest={createCoparentingSwapRequest}
              onResolveSwapRequest={resolveCoparentingSwapRequest}
              canManage={canManageCoparentingData}
            />
          )}

          {tab === "settings" && (
            <SettingsTab
              profile={profile}
              onProfileSaved={setProfile}
              kids={kids}
              setKids={setKids}
              pets={pets}
              setPets={setPets}
              invites={invites}
              householdMembers={householdMembers}
              onInvite={createInvite}
              onRevokeInvite={revokeInvite}
              currentHouseholdRole={currentHouseholdRole}
              notificationPreferences={notificationPreferences}
              onSaveNotificationPreferences={saveNotificationPreferences}
            />
          )}

          {tab === "billing" && (
            <BillingTab billing={billing} canManageBilling={canManageBillingData} />
          )}

        </main>
      </div>

      {/* FAB (desktop, home + insights) */}
      {!isMobile && (tab === "home" || tab === "insights") && (
        <FabMenu
          onAddEvent={() => { if (canManageSharedData) { setTab("calendar"); setAddEventSignal((n) => n + 1) } }}
          onAddTask={() => { if (canManageTaskData) { setTab("tasks"); setAddTaskSignal((n) => n + 1) } }}
        />
      )}

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileNav tab={tab} onTab={setTab} scannedCount={scannedEvents.length} pendingTaskCount={pending.length} />
      )}

    </div>
  )
}
