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
  created_at: string
  updated_at: string
}

export interface Kid {
  id: string
  profile_id: string
  name: string
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
  event_type: "calendar_invite" | "appointment" | "school_event" | "medical" | "other"
  organization_name: string | null
  organization_type: "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | null
  source_from: string
  snippet: string
}

export interface ScannedOrganization {
  id: string
  profile_id: string
  name: string
  type: string
  email_domain: string
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
