import type { ScannedEventRow } from "../types"

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
