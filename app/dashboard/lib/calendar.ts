export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function getMonthDays(monthDate: Date): (Date | null)[] {
  const y = monthDate.getFullYear(), m = monthDate.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days: (Date | null)[] = Array(first).fill(null)
  const total = new Date(y, m + 1, 0).getDate()
  for (let i = 1; i <= total; i++) days.push(new Date(y, m, i))
  return days
}

export function timeToY(time: string | null, startHour: number, hourHeight: number): number {
  if (!time) return 0
  const [h, m] = time.split(":").map(Number)
  return ((h * 60 + (m || 0)) - startHour * 60) * (hourHeight / 60)
}
