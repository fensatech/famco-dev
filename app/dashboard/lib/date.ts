export function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

export function fmtTime(t: string | null): string {
  if (!t) return ""
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}
