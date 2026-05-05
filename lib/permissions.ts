import type { HouseholdRole } from "@/types"

const ROLE_RANK: Record<HouseholdRole, number> = {
  owner: 4,
  adult: 3,
  co_parent: 3,
  member: 1,
}

export function canManageBilling(role: HouseholdRole) {
  return role === "owner"
}

export function canManageInvites(role: HouseholdRole) {
  return role === "owner"
}

export function canEditHousehold(role: HouseholdRole) {
  return ROLE_RANK[role] >= ROLE_RANK.adult
}

export function canManageDocuments(role: HouseholdRole) {
  return canEditHousehold(role)
}

export function canManageExpenses(role: HouseholdRole) {
  return canEditHousehold(role)
}

export function canManageCoParenting(role: HouseholdRole) {
  return canEditHousehold(role)
}

export function canManageSharedCalendar(role: HouseholdRole) {
  return canEditHousehold(role)
}

export function canManageTasks(role: HouseholdRole) {
  return canEditHousehold(role)
}

export function canResolveSwapRequests(role: HouseholdRole) {
  return ROLE_RANK[role] >= ROLE_RANK.co_parent
}
