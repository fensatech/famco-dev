import type { KidRow, PetRow, ProfileData } from "../types"

export interface HouseholdSetupStatus {
  readyForInboxSync: boolean
  checklist: string[]
  summary: string
}

export function getHouseholdSetupStatus(
  profile: ProfileData,
  kids: KidRow[],
  pets: PetRow[],
): HouseholdSetupStatus {
  const checklist: string[] = []
  const hasLocation = profile.city.trim() && profile.timezone.trim()
  const hasFamilyType = !!profile.familyType
  const hasPartnerContext = [profile.spouseFirstName, profile.spouseLastName, profile.spouseEmail]
    .some((value) => (value ?? "").trim().length > 0)
  const hasPetContext = pets.some((pet) => pet.name.trim())
  const hasKids = kids.length > 0
  const hasKidContext = kids.some((kid) =>
    [kid.schoolName, kid.daycareName, kid.grade].some((value) => (value ?? "").trim().length > 0),
  )

  if (!hasLocation) checklist.push("confirm your location")
  if (!hasFamilyType) checklist.push("choose your household type")
  if (!hasKids && !hasPartnerContext && !hasPetContext) {
    checklist.push("add at least one child, partner, or pet")
  } else if (hasKids && !hasKidContext) {
    checklist.push("add school or daycare details")
  }

  const summary =
    checklist.length <= 2
      ? checklist.join(" and ")
      : `${checklist.slice(0, 2).join(" and ")} and more`

  return {
    readyForInboxSync: checklist.length === 0,
    checklist,
    summary,
  }
}
