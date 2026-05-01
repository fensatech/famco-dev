export const EVENT_TYPE_ICON: Record<string, string> = {
  calendar_invite: "📆", appointment: "📋", school_event: "🏫", medical: "🩺",
  field_trip: "🚌", no_school: "🚫", special_day: "🎉", other: "📧",
  activity: "⚽", recital: "🎭", subscription: "💳", invoice: "🧾", bill: "📄",
}

export const EVENT_TYPE_LABEL: Record<string, string> = {
  calendar_invite: "Calendar", appointment: "Appointment", school_event: "School",
  medical: "Medical", field_trip: "Field Trip", no_school: "No School",
  special_day: "Special Day", activity: "Activity", recital: "Performance",
  subscription: "Subscription", invoice: "Invoice", bill: "Bill", other: "Other",
}

export const MEMBER_COLORS = ["#818cf8", "#f472b6", "#34d399", "#fb923c", "#60a5fa", "#a78bfa", "#fbbf24"]

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}
