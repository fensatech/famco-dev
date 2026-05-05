import type { ScannedEventAction } from "@/types"
import type { ScannedEventRow } from "../types"

export function getScannedEventMemberName(event: ScannedEventRow, action?: ScannedEventAction): string | null {
  if (action?.corrected_member_name?.trim()) return action.corrected_member_name.trim()
  if (event.related_member_name?.trim()) return event.related_member_name.trim()
  if (event.kid_name?.trim()) return event.kid_name.trim()
  return event.related_member_type === "family" ? "Family" : null
}

export function getScannedEventMemberType(
  event: ScannedEventRow,
  action?: ScannedEventAction,
): "adult" | "child" | "pet" | "family" | null {
  if (action?.corrected_member_type) return action.corrected_member_type
  if (event.related_member_type) return event.related_member_type
  return event.kid_name ? "child" : null
}

export function matchesScannedEventMember(
  event: ScannedEventRow,
  filterName: string | null,
  action?: ScannedEventAction,
): boolean {
  if (!filterName) return true

  const memberName = getScannedEventMemberName(event, action)
  const memberType = getScannedEventMemberType(event, action)

  if (filterName === "Family") {
    return memberType === "family" || !memberName
  }

  return (memberName ?? "").toLowerCase() === filterName.toLowerCase()
}
