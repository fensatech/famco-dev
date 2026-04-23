export type FamilyType =
  | "single_parent"
  | "co_parent"
  | "full_household"
  | "blended"

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  city: string | null
  timezone: string | null
  phone: string | null
  family_type: FamilyType | null
  co_parent_email: string | null
  partner_name: string | null
  onboarding_step: number
  onboarding_completed: boolean
  // Spouse
  spouse_first_name: string | null
  spouse_last_name: string | null
  spouse_phone: string | null
  spouse_email: string | null
  // Full address
  address_street: string | null
  address_province: string | null
  address_postal: string | null
  address_country: string | null
  // Work
  work_type: string | null
  work_address: string | null
  spouse_work_type: string | null
  spouse_work_address: string | null
  created_at: string
  updated_at: string
}

export interface Kid {
  id: string
  profile_id: string
  name: string
  first_name: string | null
  last_name: string | null
  dob: string | null
  school_name: string | null
  grade: string | null
  daycare_name: string | null
  daycare_address: string | null
  created_at: string
}

export interface Pet {
  id: string
  profile_id: string
  name: string
  animal_type: string
  breed: string | null
  dob: string | null
  created_at: string
}

export interface CalendarFile {
  id: string
  profile_id: string
  kid_id: string | null
  filename: string
  storage_path: string
  created_at: string
}

export interface ScannedEvent {
  gmail_message_id: string
  title: string
  event_date: string | null
  start_time: string | null
  end_time: string | null
  event_type:
    | "calendar_invite" | "appointment" | "school_event" | "medical"
    | "field_trip" | "no_school" | "special_day"
    | "activity" | "recital" | "subscription" | "invoice" | "bill" | "other"
  organization_name: string | null
  organization_type: "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | null
  source_from: string
  snippet: string
  kid_name: string | null
  grade: string | null
  school_name: string | null
  special_instructions: string | null
  urgency: "high" | "normal" | "low"
  auto_add_to_calendar: boolean
  calendar_title: string | null
  ai_processed: boolean
  vendor: string | null
  amount: number | null
  recurrence: "monthly" | "annual" | "weekly" | "one_time" | null
}

export interface ScannedOrganization {
  id: string
  profile_id: string
  name: string
  type: string
  email_domain: string
}

// ── Family Knowledge Graph ────────────────────────────────────────────────────

export type FactPredicate =
  | "attends_school"    // kid → school name
  | "current_grade"     // kid → "Grade 6", "JK"
  | "participates_in"   // kid/parent → activity/sport/music
  | "taught_by"         // kid → coach/teacher/instructor name
  | "sees_doctor"       // kid/parent → clinic or doctor name
  | "sees_dentist"      // kid/parent/family → dental clinic
  | "uses_pharmacy"     // family → pharmacy name
  | "subscribes_to"     // family/parent → digital service (+ price)
  | "pays_bill"         // family/parent → recurring bill (+ price)
  | "serves_grades"     // institution → grade range e.g. "4-9"

export interface FamilyFact {
  id: string
  profile_id: string
  subject: string           // person name or institution name
  subject_type: "kid" | "parent" | "family" | "institution"
  predicate: FactPredicate
  object: string
  confidence: number        // 0.0–1.0
  evidence_count: number
  source_email_ids: string[]
  status: "confirmed" | "uncertain" | "conflicted"
  first_seen: string
  last_confirmed: string
}

export interface RawFact {
  gmail_message_id: string
  subject: string
  subject_type: "kid" | "parent" | "family" | "institution"
  predicate: FactPredicate
  object: string
  confidence: number
}

export const ONBOARDING_STEPS = [
  "profile",
  "location",
  "family",
  "kids",
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const STEP_LABELS: Record<OnboardingStep, string> = {
  profile: "Profile",
  location: "Location",
  family: "Family",
  kids: "Kids",
}

export const FAMILY_TYPE_OPTIONS: {
  value: FamilyType
  label: string
  icon: string
  description: string
}[] = [
  {
    value: "single_parent",
    icon: "👩‍👧‍👦",
    label: "Single Parent",
    description: "I manage my kids' schedule on my own",
  },
  {
    value: "co_parent",
    icon: "🤝",
    label: "Co-Parenting",
    description: "I share custody or co-parent with someone",
  },
  {
    value: "full_household",
    icon: "👨‍👩‍👧‍👦",
    label: "Full Household",
    description: "Two parents living together with kids",
  },
  {
    value: "blended",
    icon: "🌍",
    label: "Blended Family",
    description: "Step-kids, multiple families combined",
  },
]
