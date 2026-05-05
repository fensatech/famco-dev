export const REMINDER_OFFSET_OPTIONS = [
  { value: 0, label: "At time of schedule", timedEventLabel: "At time of event", timedTaskLabel: "At due time" },
  { value: 30, label: "30 minutes before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 10080, label: "1 week before" },
] as const

export type ReminderOffsetMinutes = (typeof REMINDER_OFFSET_OPTIONS)[number]["value"]

export const DEFAULT_REMINDER_OFFSET_MINUTES: ReminderOffsetMinutes = 0

const REMINDER_OFFSET_LOOKUP = new Set<number>(REMINDER_OFFSET_OPTIONS.map((option) => option.value))

export function normalizeReminderOffsetMinutes(value: unknown): ReminderOffsetMinutes {
  const parsed = Number(value)
  if (REMINDER_OFFSET_LOOKUP.has(parsed)) {
    return parsed as ReminderOffsetMinutes
  }
  return DEFAULT_REMINDER_OFFSET_MINUTES
}

export function getReminderOffsetLabel(
  value: number | null | undefined,
  kind: "event" | "task",
  hasSpecificTime: boolean,
): string {
  const normalized = normalizeReminderOffsetMinutes(value)
  const option = REMINDER_OFFSET_OPTIONS.find((entry) => entry.value === normalized) ?? REMINDER_OFFSET_OPTIONS[0]
  if (normalized === 0 && hasSpecificTime) {
    if (kind === "event" && "timedEventLabel" in option) {
      return option.timedEventLabel
    }
    if (kind === "task" && "timedTaskLabel" in option) {
      return option.timedTaskLabel
    }
  }
  return option.label
}

function timeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const [hours, minutes] = value.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export function isWithinQuietHours(
  date: Date,
  quietHoursStart: string | null | undefined,
  quietHoursEnd: string | null | undefined,
): boolean {
  const startMinutes = timeToMinutes(quietHoursStart)
  const endMinutes = timeToMinutes(quietHoursEnd)
  if (startMinutes == null || endMinutes == null) return false

  const currentMinutes = date.getHours() * 60 + date.getMinutes()
  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}
