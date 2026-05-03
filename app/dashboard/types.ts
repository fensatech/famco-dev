import type { Event, Task, CoParentingSchedule, CoParentingOverride } from "@/lib/db"
import type { FamilyFact, FamilyInvite, HouseholdMember, Reminder, ScannedEventAction } from "@/types"

export type { CoParentingSchedule, CoParentingOverride }

export interface ProfileData {
  firstName: string; lastName: string; email: string
  phone: string; city: string; timezone: string; familyType: import("@/types").FamilyType | null
  createdAt: string
  spouseFirstName: string; spouseLastName: string; spousePhone: string; spouseEmail: string
  addressStreet: string; addressProvince: string; addressPostal: string; addressCountry: string
  workType: string; workAddress: string; spouseWorkType: string; spouseWorkAddress: string
}

export interface KidRow {
  id: string; name: string; firstName: string | null; lastName: string | null
  dob: string | null; schoolName: string | null; grade: string | null
  daycareName: string | null; daycareAddress: string | null
}

export interface PetRow {
  id: string; name: string; animalType: string; breed: string | null; dob: string | null
}

export interface ScannedEventRow {
  id: string; title: string; event_date: string | null
  start_time: string | null; end_time: string | null
  event_type: string; organization_name: string | null
  organization_type: string | null; source_from: string; snippet: string
  kid_name: string | null; grade: string | null; school_name: string | null
  special_instructions: string | null; urgency: string
  auto_add_to_calendar: boolean; calendar_title: string | null; ai_processed: boolean
  vendor: string | null; amount: number | null; recurrence: string | null
}

export interface ExpenseRow {
  id: string; title: string; amount: number; category: string | null
  expense_date: string; notes: string | null
}

export interface GCalEvent {
  id: string | null; title: string; start: string | null; end: string | null
  allDay: boolean; location: string | null; description?: string | null
}

export type Tab = "home" | "calendar" | "tasks" | "insights" | "data" | "expenses" | "coparenting" | "settings"
export type CalView = "day" | "week" | "month"

export interface DashboardViewModel {
  profile: ProfileData
  kids: KidRow[]
  pets: PetRow[]
  events: Event[]
  tasks: Task[]
  scannedEvents: ScannedEventRow[]
  facts: FamilyFact[]
  invites: FamilyInvite[]
  householdMembers: HouseholdMember[]
  insightActions: ScannedEventAction[]
  reminders: Reminder[]
  provider: string
  appVersion: string
}

export type DashboardShellProps = DashboardViewModel

export const NAV: { id: Tab; label: string; color: string; bg: string; gradient: string }[] = [
  { id: "home",     label: "Home",          color: "#6366F1", bg: "rgba(99,102,241,0.1)",  gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { id: "calendar", label: "Calendar",      color: "#0EA5E9", bg: "rgba(14,165,233,0.1)",  gradient: "linear-gradient(135deg,#0EA5E9,#6366F1)" },
  { id: "tasks",    label: "Tasks",         color: "#EC4899", bg: "rgba(236,72,153,0.1)",  gradient: "linear-gradient(135deg,#EC4899,#F43F5E)" },
  { id: "insights", label: "Insights",      color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  gradient: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  { id: "data",     label: "Family Knowledge", color: "#10B981", bg: "rgba(16,185,129,0.1)",  gradient: "linear-gradient(135deg,#10B981,#0EA5E9)" },
  { id: "expenses",    label: "Expenses",       color: "#F97316", bg: "rgba(249,115,22,0.1)",  gradient: "linear-gradient(135deg,#F97316,#EAB308)" },
  { id: "coparenting", label: "Co-Parenting",   color: "#06B6D4", bg: "rgba(6,182,212,0.1)",   gradient: "linear-gradient(135deg,#06B6D4,#6366F1)" },
  { id: "settings",    label: "Manage Family",  color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
]
