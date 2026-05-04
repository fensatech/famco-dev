import type { Profile } from "@/types"

export const BILLING_MONTHLY_PRICE = 10
export const BILLING_TRIAL_DAYS = 30
export const BILLING_GRACE_DAYS = 7
export const BILLING_PROVIDER = "paypal" as const

export type BillingStatus = "trial" | "grace" | "expired" | "active"

export interface BillingSummary {
  provider: typeof BILLING_PROVIDER
  monthlyPrice: number
  trialDays: number
  graceDays: number
  status: BillingStatus
  trialEndsAt: string
  graceEndsAt: string
  syncStopsAt: string
  accessEndsAt: string
  daysRemaining: number
  loginAllowedWhenEnforced: boolean
  syncAllowedWhenEnforced: boolean
  enforcementEnabled: boolean
  primaryUserName: string
  primaryUserEmail: string
  isPrimaryUser: boolean
  paypalSubscribeUrl: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfMinute(value: Date) {
  const copy = new Date(value)
  copy.setSeconds(0, 0)
  return copy
}

function toIso(value: Date) {
  return value.toISOString()
}

function daysUntil(target: Date, now: Date) {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS))
}

export function billingEnforcementEnabled() {
  return process.env.ENFORCE_BILLING === "true"
}

export function normalizeBillingEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getPrimaryUserName(profile: Pick<Profile, "first_name" | "last_name" | "email">) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || profile.email
}

export function getTrialStartedAt(profile: Pick<Profile, "billing_trial_started_at" | "created_at">) {
  return profile.billing_trial_started_at ?? profile.created_at
}

export function getTrialWindow(trialStartedAtIso: string, now = new Date()) {
  const signupAt = new Date(trialStartedAtIso)
  const normalizedNow = startOfMinute(now)
  const trialEndsAt = addDays(signupAt, BILLING_TRIAL_DAYS)
  const graceEndsAt = addDays(trialEndsAt, BILLING_GRACE_DAYS)

  let status: BillingStatus = "expired"
  let daysRemaining = 0

  if (normalizedNow < trialEndsAt) {
    status = "trial"
    daysRemaining = daysUntil(trialEndsAt, normalizedNow)
  } else if (normalizedNow < graceEndsAt) {
    status = "grace"
    daysRemaining = daysUntil(graceEndsAt, normalizedNow)
  }

  return {
    trialStartedAt: toIso(signupAt),
    trialEndsAt: toIso(trialEndsAt),
    graceEndsAt: toIso(graceEndsAt),
    status,
    daysRemaining,
  }
}

export function isPastGracePeriod(trialStartedAtIso: string, now = new Date()) {
  return getTrialWindow(trialStartedAtIso, now).status === "expired"
}

export function isSyncAllowedForProfile(profile: Pick<Profile, "billing_trial_started_at" | "created_at">, now = new Date()) {
  return getTrialWindow(getTrialStartedAt(profile), now).status === "trial"
}

export function isLoginAllowedForProfile(profile: Pick<Profile, "billing_trial_started_at" | "created_at">, now = new Date()) {
  return getTrialWindow(getTrialStartedAt(profile), now).status !== "expired"
}

export function buildBillingSummary(input: {
  primaryProfile: Pick<Profile, "id" | "first_name" | "last_name" | "email" | "created_at" | "billing_trial_started_at">
  currentProfileId: string
  now?: Date
  paypalSubscribeUrl?: string | null
  enforcementEnabled?: boolean
}): BillingSummary {
  const now = startOfMinute(input.now ?? new Date())
  const trialStartedAt = getTrialStartedAt(input.primaryProfile)
  const trialWindow = getTrialWindow(trialStartedAt, now)

  return {
    provider: BILLING_PROVIDER,
    monthlyPrice: BILLING_MONTHLY_PRICE,
    trialDays: BILLING_TRIAL_DAYS,
    graceDays: BILLING_GRACE_DAYS,
    status: trialWindow.status,
    trialEndsAt: trialWindow.trialEndsAt,
    graceEndsAt: trialWindow.graceEndsAt,
    syncStopsAt: trialWindow.trialEndsAt,
    accessEndsAt: trialWindow.graceEndsAt,
    daysRemaining: trialWindow.daysRemaining,
    loginAllowedWhenEnforced: trialWindow.status !== "expired",
    syncAllowedWhenEnforced: trialWindow.status === "trial",
    enforcementEnabled: input.enforcementEnabled ?? billingEnforcementEnabled(),
    primaryUserName: getPrimaryUserName(input.primaryProfile),
    primaryUserEmail: input.primaryProfile.email,
    isPrimaryUser: input.primaryProfile.id === input.currentProfileId,
    paypalSubscribeUrl: input.paypalSubscribeUrl ?? process.env.NEXT_PUBLIC_PAYPAL_SUBSCRIBE_URL ?? null,
  }
}
