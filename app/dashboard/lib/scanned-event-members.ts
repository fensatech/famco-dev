import type { ScannedEventRow } from "../types"

export function getScannedEventMemberName(event: ScannedEventRow): string | null {
  if (event.related_member_name?.trim()) return event.related_member_name.trim()
  if (event.kid_name?.trim()) return event.kid_name.trim()
  return event.related_member_type === "family" ? "Family" : null
}

export function getScannedEventMemberType(
  event: ScannedEventRow,
): "adult" | "child" | "pet" | "family" | null {
  if (event.related_member_type) return event.related_member_type
  return event.kid_name ? "child" : null
}

export function matchesScannedEventMember(
  event: ScannedEventRow,
  filterName: string | null,
): boolean {
  if (!filterName) return true

  const memberName = getScannedEventMemberName(event)
  const memberType = getScannedEventMemberType(event)

  if (filterName === "Family") {
    return memberType === "family" || !memberName
  }

  return (memberName ?? "").toLowerCase() === filterName.toLowerCase()
}
