import type { Event, Task, CoParentingSchedule, CoParentingOverride } from "@/lib/db"
import type { BillingSummary } from "@/lib/billing"
import type {
  CoParentingSwapRequest,
  FamilyDocument,
  FamilyFact,
  FamilyInvite,
  HouseholdMember,
  HouseholdNotificationPreferences,
  HouseholdRole,
  Reminder,
  ScannedEventAction,
} from "@/types"

export type { CoParentingSchedule, CoParentingOverride, CoParentingSwapRequest }

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
  dob: string | null; schoolName: string | null; schoolAddress: string | null; grade: string | null
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
  related_member_name: string | null; related_member_type: "adult" | "child" | "pet" | "family" | null
  kid_name: string | null; grade: string | null; school_name: string | null
  special_instructions: string | null; urgency: string
  auto_add_to_calendar: boolean; calendar_title: string | null; ai_processed: boolean
  vendor: string | null; amount: number | null; recurrence: string | null
}

export interface ExpenseRow {
  id: string; title: string; amount: number; category: string | null
  expense_date: string; notes: string | null
}

export interface DocumentRow {
  id: string
  title: string
  file_name: string
  storage_path: string
  content_type: string | null
  byte_size: number
  category: FamilyDocument["category"]
  member_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GCalEvent {
  id: string | null; title: string; start: string | null; end: string | null
  allDay: boolean; location: string | null; description?: string | null
  member_name?: string | null
}

export interface CalendarMemberOption {
  name: string
  shortLabel: string
  color: string
  kind: "family" | "adult" | "child" | "pet"
}

export type Tab = "home" | "calendar" | "tasks" | "insights" | "data" | "expenses" | "documents" | "coparenting" | "settings" | "billing"
export type CalView = "day" | "week" | "month"
export type { BillingSummary }

export interface DashboardViewModel {
  currentProfileId: string
  currentUserFirstName: string
  currentHouseholdRole: HouseholdRole
  notificationPreferences: HouseholdNotificationPreferences
  profile: ProfileData
  billing: BillingSummary
  kids: KidRow[]
  pets: PetRow[]
  events: Event[]
  tasks: Task[]
  scannedEvents: ScannedEventRow[]
  facts: FamilyFact[]
  documents: DocumentRow[]
  invites: FamilyInvite[]
  householdMembers: HouseholdMember[]
  insightActions: ScannedEventAction[]
  reminders: Reminder[]
  provider: string
  appVersion: string
  isAdmin: boolean
}

export type DashboardShellProps = DashboardViewModel

export const NAV: { id: Tab; label: string; color: string; bg: string; gradient: string }[] = [
  { id: "home",     label: "Home",          color: "#6366F1", bg: "rgba(99,102,241,0.1)",  gradient: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  { id: "calendar", label: "Calendar",      color: "#0EA5E9", bg: "rgba(14,165,233,0.1)",  gradient: "linear-gradient(135deg,#0EA5E9,#6366F1)" },
  { id: "tasks",    label: "Tasks",         color: "#EC4899", bg: "rgba(236,72,153,0.1)",  gradient: "linear-gradient(135deg,#EC4899,#F43F5E)" },
  { id: "insights", label: "Insights",      color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  gradient: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  { id: "data",     label: "Family Knowledge", color: "#10B981", bg: "rgba(16,185,129,0.1)",  gradient: "linear-gradient(135deg,#10B981,#0EA5E9)" },
  { id: "expenses", label: "Expenses",          color: "#F97316", bg: "rgba(249,115,22,0.1)",  gradient: "linear-gradient(135deg,#F97316,#EAB308)" },
  { id: "documents", label: "Documents",        color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  gradient: "linear-gradient(135deg,#3B82F6,#14B8A6)" },
  { id: "coparenting", label: "Co-Parenting",   color: "#06B6D4", bg: "rgba(6,182,212,0.1)",   gradient: "linear-gradient(135deg,#06B6D4,#6366F1)" },
  { id: "settings", label: "Manage Family",     color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  gradient: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
  { id: "billing", label: "Billing",            color: "#14B8A6", bg: "rgba(20,184,166,0.1)",  gradient: "linear-gradient(135deg,#14B8A6,#0EA5E9)" },
]
