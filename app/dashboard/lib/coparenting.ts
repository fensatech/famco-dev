export type Parent = "a" | "b"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function parseUTC(s: string): Date {
  return new Date(s.slice(0, 10) + "T00:00:00Z")
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function computeParent(scheduleType: string, startDate: string, dateStr: string): Parent {
  const diff = daysBetween(parseUTC(startDate), parseUTC(dateStr))
  if (diff < 0) return "a"
  switch (scheduleType) {
    case "week_on_off":
      return Math.floor(diff / 7) % 2 === 0 ? "a" : "b"
    case "223": {
      const c = diff % 14
      if (c < 2) return "a"
      if (c < 4) return "b"
      if (c < 7) return "a"
      if (c < 9) return "b"
      if (c < 11) return "a"
      return "b"
    }
    case "2255": {
      const c = diff % 14
      if (c < 2) return "a"
      if (c < 4) return "b"
      if (c < 9) return "a"
      return "b"
    }
    case "alt_weekends": {
      const d = parseUTC(dateStr)
      const dow = d.getUTCDay()
      if (dow >= 1 && dow <= 5) return "a"
      // Sat=6, Sun=0 — find the Saturday of this weekend
      const satOffset = dow === 6 ? 0 : -1
      const satDiff = diff + satOffset
      if (satDiff < 0) return "a"
      return Math.floor(satDiff / 7) % 2 === 0 ? "b" : "a"
    }
    default:
      return "a"
  }
}

export function resolveParent(
  scheduleType: string,
  startDate: string,
  dateStr: string,
  overrides: Array<{ override_date: string; assigned_to: string }>
): Parent {
  const override = overrides.find((o) => o.override_date.slice(0, 10) === dateStr.slice(0, 10))
  if (override) return override.assigned_to as Parent
  return computeParent(scheduleType, startDate, dateStr)
}

export interface WeekDayInfo {
  date: string
  dayLabel: string
  dateNum: number
  monthLabel: string
  parent: Parent
  isToday: boolean
  isExchange: boolean
}

export function buildWeekStrip(
  schedule: { schedule_type: string; start_date: string },
  overrides: Array<{ override_date: string; assigned_to: string }>,
  fromDate: string
): WeekDayInfo[] {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(parseUTC(fromDate))
    d.setUTCDate(d.getUTCDate() + i)
    const dateStr = d.toISOString().slice(0, 10)

    const prev = new Date(parseUTC(fromDate))
    prev.setUTCDate(prev.getUTCDate() + i - 1)
    const prevStr = prev.toISOString().slice(0, 10)

    const parent = resolveParent(schedule.schedule_type, schedule.start_date, dateStr, overrides)
    const prevParent = resolveParent(schedule.schedule_type, schedule.start_date, prevStr, overrides)

    return {
      date: dateStr,
      dayLabel: DAY_NAMES[d.getUTCDay()],
      dateNum: d.getUTCDate(),
      monthLabel: MONTHS[d.getUTCMonth()],
      parent,
      isToday: i === 0,
      isExchange: parent !== prevParent,
    }
  })
}

export function findNextExchange(
  schedule: { schedule_type: string; start_date: string },
  overrides: Array<{ override_date: string; assigned_to: string }>,
  fromDate: string
): string | null {
  for (let i = 1; i <= 45; i++) {
    const d = new Date(parseUTC(fromDate))
    d.setUTCDate(d.getUTCDate() + i)
    const dateStr = d.toISOString().slice(0, 10)

    const prev = new Date(parseUTC(fromDate))
    prev.setUTCDate(prev.getUTCDate() + i - 1)
    const prevStr = prev.toISOString().slice(0, 10)

    const curr = resolveParent(schedule.schedule_type, schedule.start_date, dateStr, overrides)
    const previous = resolveParent(schedule.schedule_type, schedule.start_date, prevStr, overrides)
    if (curr !== previous) return dateStr
  }
  return null
}

export function formatExchangeDate(dateStr: string, fromDate: string, exchangeTime: string | null): string {
  const d = parseUTC(dateStr)
  const from = parseUTC(fromDate)
  const diff = daysBetween(from, d)
  const time = exchangeTime ? ` · ${fmtExchangeTime(exchangeTime)}` : ""
  if (diff === 0) return `Today${time}`
  if (diff === 1) return `Tomorrow${time}`
  if (diff <= 6) return `${DAY_NAMES[d.getUTCDay()]}${time}`
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${time}`
}

function fmtExchangeTime(t: string): string {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const m = mStr ?? "00"
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return m === "00" ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`
}
