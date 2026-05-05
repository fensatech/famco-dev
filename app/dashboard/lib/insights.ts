import type { ScannedEventAction } from "@/types"
import type { ScannedEventRow } from "../types"
import { getScannedEventMemberName, getScannedEventMemberType } from "./scanned-event-members"

export const INSIGHT_CATEGORIES = [
  { id: "activities",    label: "Activities",    icon: "⚽", accent: "#60a5fa", types: ["activity","recital"] },
  { id: "school",        label: "School",        icon: "🏫", accent: "#34d399", types: ["school_event","field_trip","no_school","special_day"] },
  { id: "medical",       label: "Medical",       icon: "🩺", accent: "#a78bfa", types: ["medical"] },
  { id: "appointments",  label: "Appointments",  icon: "📋", accent: "#f472b6", types: ["appointment","calendar_invite"] },
  { id: "subscriptions", label: "Payments",      icon: "💳", accent: "#818cf8", types: ["subscription","invoice","bill"] },
]

export function sortEvents(evts: ScannedEventRow[], order: "newest" | "oldest"): ScannedEventRow[] {
  return [...evts].sort((a, b) => {
    const da = String(a.event_date ?? ""), db = String(b.event_date ?? "")
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return order === "newest" ? db.localeCompare(da) : da.localeCompare(db)
  })
}

export function insightsDaysUntil(date: string, today: string): { label: string; color: string } {
  const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000)
  if (diff === 0) return { label: "Today", color: "#f472b6" }
  if (diff === 1) return { label: "Tomorrow", color: "#fbbf24" }
  if (diff <= 7) return { label: `In ${diff}d`, color: "#34d399" }
  if (diff <= 30) return { label: `In ${diff}d`, color: "#60a5fa" }
  return { label: `In ${diff}d`, color: "var(--muted)" }
}

export function insightsFmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export interface InsightTrustProfile {
  level: "high" | "medium" | "review"
  label: string
  color: string
  reasons: string[]
}

export interface InsightPriorityProfile {
  score: number
  label: string
  color: string
  reasons: string[]
}

function uniqueReasons(reasons: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const reason of reasons) {
    const trimmed = reason.trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

export function getInsightTrustProfile(event: ScannedEventRow, action?: ScannedEventAction): InsightTrustProfile {
  const memberName = getScannedEventMemberName(event, action)
  const memberType = getScannedEventMemberType(event, action)
  const reasons: string[] = []
  let score = 0

  if (action?.relevance === "needs_review") {
    reasons.push("A household member flagged this item for review.")
    score -= 2
  } else if (action?.relevance === "not_relevant") {
    reasons.push("Marked not relevant by the household.")
    score -= 3
  }

  if (action?.corrected_member_name || action?.corrected_member_type || action?.corrected_event_type) {
    reasons.push("This match was refined using household feedback.")
    score += 2
  }

  if (event.ai_processed) {
    reasons.push("Processed with AI using your Manage Family household context.")
    score += 2
  } else {
    reasons.push("Matched using saved family details and email pattern rules.")
    score += 1
  }

  if (memberType === "child" && memberName && event.school_name) {
    reasons.push(`Matched to ${memberName} because ${event.school_name} is linked to this child.`)
    score += 2
  } else if (memberType === "child" && memberName) {
    reasons.push(
      `Matched to ${memberName}${event.grade ? ` using the child name and ${event.grade}` : " using the child name found in the email"}.`,
    )
    score += 2
  } else if (memberType === "adult" && memberName) {
    reasons.push(`Matched to ${memberName} using adult household details from Manage Family.`)
    score += 2
  } else if (memberType === "pet" && memberName) {
    reasons.push(`Matched to ${memberName} using your pet profile and related email wording.`)
    score += 2
  } else if (memberType === "family") {
    reasons.push("Marked for the whole household because the email appears relevant to all parents or family members.")
    score += 1
  } else {
    reasons.push("This item does not have a strong member match yet, so it may need a quick review.")
  }

  if (event.event_date) {
    reasons.push(`Famco detected a ${event.start_time ? "date and time" : "date"}, so this can be organized in your schedule.`)
    score += 1
  }

  if (event.special_instructions) {
    reasons.push("Action or preparation details were detected, so this was surfaced for follow-up.")
    score += 1
  }

  if (
    (event.event_type === "subscription" || event.event_type === "invoice" || event.event_type === "bill") &&
    (event.vendor || event.amount != null)
  ) {
    reasons.push(
      `Billing details${event.vendor ? ` from ${event.vendor}` : ""}${event.amount != null ? ` for $${Number(event.amount).toFixed(2)}` : ""} were detected in the email.`,
    )
    score += 1
  }

  if (event.organization_name && event.school_name && event.organization_name !== event.school_name) {
    reasons.push(`Organization details from ${event.organization_name} also support the school match.`)
  }

  if (score >= 5) {
    return {
      level: "high",
      label: "High confidence",
      color: "#22c55e",
      reasons: uniqueReasons(reasons).slice(0, 4),
    }
  }

  if (score >= 3) {
    return {
      level: "medium",
      label: "Good confidence",
      color: "#f59e0b",
      reasons: uniqueReasons(reasons).slice(0, 4),
    }
  }

  return {
    level: "review",
    label: "Needs review",
    color: "#f87171",
    reasons: uniqueReasons(reasons).slice(0, 4),
  }
}

function getDateDiffDays(date: string, today: string): number {
  return Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000)
}

export function getInsightPriorityProfile(event: ScannedEventRow, today: string, action?: ScannedEventAction): InsightPriorityProfile {
  const reasons: string[] = []
  let score = 0

  if (action?.relevance === "not_relevant") {
    return {
      score: -1,
      label: "Muted",
      color: "#64748b",
      reasons: ["Hidden from the main household queue after being marked not relevant."],
    }
  }

  if (action?.relevance === "needs_review") {
    score += 2
    reasons.push("A household member marked this item for review.")
  }

  if (event.urgency === "high") {
    score += 4
    reasons.push("Marked urgent based on the email content.")
  } else if (event.urgency === "normal") {
    score += 1
  }

  const dateStr = event.event_date ? String(event.event_date).slice(0, 10) : null
  if (dateStr) {
    const diff = getDateDiffDays(dateStr, today)
    if (diff < 0) {
      score += 2
      reasons.push("The event date has already passed, so it may need a catch-up review.")
    } else if (diff === 0) {
      score += 5
      reasons.push("Happening today.")
    } else if (diff === 1) {
      score += 4
      reasons.push("Happening tomorrow.")
    } else if (diff <= 3) {
      score += 3
      reasons.push(`Coming up within ${diff} day${diff === 1 ? "" : "s"}.`)
    } else if (diff <= 7) {
      score += 2
      reasons.push("Coming up this week.")
    }
  }

  if (event.special_instructions) {
    score += 3
    reasons.push("Contains preparation or follow-up instructions.")
  }

  if (event.event_type === "field_trip" || event.event_type === "medical" || event.event_type === "appointment") {
    score += 2
    reasons.push("This type of event usually needs a concrete family action.")
  }

  if (event.event_type === "no_school" || event.event_type === "special_day") {
    score += 2
    reasons.push("This can affect the household schedule or school routine.")
  }

  if ((event.event_type === "subscription" || event.event_type === "bill" || event.event_type === "invoice") && event.amount != null) {
    score += 2
    reasons.push(`Includes a detected payment amount of $${Number(event.amount).toFixed(2)}.`)
  }

  if (event.auto_add_to_calendar && dateStr) {
    score += 1
    reasons.push("Famco sees this as schedule-worthy.")
  }

  if (!getScannedEventMemberName(event, action)) {
    score += 1
    reasons.push("Member match is weak, so it may need a quick review.")
  }

  const unique = uniqueReasons(reasons).slice(0, 4)

  if (score >= 10) {
    return {
      score,
      label: "Top priority",
      color: "#ef4444",
      reasons: unique,
    }
  }

  if (score >= 7) {
    return {
      score,
      label: "Needs attention",
      color: "#f59e0b",
      reasons: unique,
    }
  }

  if (score >= 4) {
    return {
      score,
      label: "Worth checking",
      color: "#3b82f6",
      reasons: unique,
    }
  }

  return {
    score,
    label: "Low priority",
    color: "#64748b",
    reasons: unique,
  }
}

export function sortEventsByPriority(
  events: ScannedEventRow[],
  today: string,
  actionsById?: Map<string, ScannedEventAction>,
): ScannedEventRow[] {
  return [...events].sort((left, right) => {
    const rightPriority = getInsightPriorityProfile(right, today, actionsById?.get(right.id))
    const leftPriority = getInsightPriorityProfile(left, today, actionsById?.get(left.id))
    if (rightPriority.score !== leftPriority.score) return rightPriority.score - leftPriority.score

    const leftDate = String(left.event_date ?? "")
    const rightDate = String(right.event_date ?? "")
    if (!leftDate && !rightDate) return 0
    if (!leftDate) return 1
    if (!rightDate) return -1
    return leftDate.localeCompare(rightDate)
  })
}
