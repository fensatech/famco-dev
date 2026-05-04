export type HouseholdScanMemberType = "adult" | "child" | "pet"

export interface HouseholdScanContextMember {
  name: string
  type: HouseholdScanMemberType
  first_name?: string | null
  grade?: string | null
  school_name?: string | null
  school_address?: string | null
  daycare_name?: string | null
  daycare_address?: string | null
  animal_type?: string | null
}

export interface HouseholdScanContext {
  members: HouseholdScanContextMember[]
  city?: string | null
  timezone?: string | null
}

export interface HouseholdMemberMatch {
  related_member_name: string | null
  related_member_type: "adult" | "child" | "pet" | "family" | null
  kid_name: string | null
  school_name: string | null
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function includesTerm(text: string, term: string): boolean {
  const normalizedText = normalize(text)
  const normalizedTerm = normalize(term)
  if (!normalizedTerm) return false
  const pattern = new RegExp(`(^|\\b)${escapeRegex(normalizedTerm).replace(/ /g, "\\s+")}(\\b|$)`, "i")
  return pattern.test(normalizedText)
}

function uniqueTerms(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

function memberAliases(member: HouseholdScanContextMember): string[] {
  const fullName = member.name.trim()
  const firstName =
    member.first_name?.trim() ||
    fullName.split(" ").find(Boolean) ||
    null

  const aliases = uniqueTerms([
    fullName,
    firstName && firstName.length >= 3 ? firstName : null,
    member.school_name,
    member.daycare_name,
  ])

  return aliases
}

export function buildContextSearchTerms(context: HouseholdScanContext): string[] {
  return uniqueTerms(
    context.members.flatMap((member) => {
      const fullName = member.name.trim()
      const firstName = member.first_name?.trim() || fullName.split(" ").find(Boolean) || null
      return [
        member.type === "adult" && fullName.includes(" ") ? fullName : null,
        member.type !== "adult" ? fullName : null,
        member.type === "child" && firstName && firstName.length >= 3 ? firstName : null,
        member.type === "pet" && firstName && firstName.length >= 3 ? firstName : null,
        member.school_name,
        member.daycare_name,
      ]
    }),
  ).slice(0, 18)
}

export function summarizeHouseholdContext(context: HouseholdScanContext): string {
  const lines: string[] = []

  const adults = context.members.filter((member) => member.type === "adult")
  const kids = context.members.filter((member) => member.type === "child")
  const pets = context.members.filter((member) => member.type === "pet")

  if (adults.length > 0) {
    lines.push(
      `Adults: ${adults
        .map((member) => member.name)
        .join(", ")}.`,
    )
  }

  if (kids.length > 0) {
    lines.push(
      `Children: ${kids
        .map((member) => {
          const detailBits = [
            member.grade,
            member.school_name ? `school: ${member.school_name}` : null,
            member.daycare_name ? `daycare: ${member.daycare_name}` : null,
          ].filter(Boolean)
          return detailBits.length > 0
            ? `${member.name} (${detailBits.join(", ")})`
            : member.name
        })
        .join("; ")}.`,
    )
  }

  if (pets.length > 0) {
    lines.push(
      `Pets: ${pets
        .map((member) => `${member.name}${member.animal_type ? ` (${member.animal_type})` : ""}`)
        .join(", ")}.`,
    )
  }

  if (context.city || context.timezone) {
    lines.push(
      `Household location: ${[context.city, context.timezone].filter(Boolean).join(" · ")}.`,
    )
  }

  return lines.join("\n")
}

function matchMemberScore(text: string, member: HouseholdScanContextMember): {
  score: number
  matchedSchool: string | null
} {
  let score = 0
  let matchedSchool: string | null = null

  const aliases = memberAliases(member)
  const fullName = member.name.trim()
  const firstName = member.first_name?.trim() || fullName.split(" ").find(Boolean) || null

  if (includesTerm(text, fullName)) score += member.type === "adult" ? 6 : 7
  if (firstName && firstName.length >= 3 && includesTerm(text, firstName)) {
    score += member.type === "adult" ? 2 : 3
  }

  if (member.type === "child") {
    if (member.school_name && includesTerm(text, member.school_name)) {
      score += 8
      matchedSchool = member.school_name
    }
    if (member.daycare_name && includesTerm(text, member.daycare_name)) {
      score += 7
      matchedSchool = member.daycare_name
    }
    if (member.grade && includesTerm(text, member.grade)) score += 1
  }

  if (member.type === "pet" && member.animal_type && includesTerm(text, member.animal_type)) {
    score += 1
  }

  for (const alias of aliases) {
    if (alias !== fullName && alias !== firstName && includesTerm(text, alias)) {
      score += 2
    }
  }

  return { score, matchedSchool }
}

export function matchRelatedMember(text: string, context: HouseholdScanContext): HouseholdMemberMatch {
  const normalizedText = normalize(text)
  let best:
    | {
        member: HouseholdScanContextMember
        score: number
        matchedSchool: string | null
      }
    | null = null

  for (const member of context.members) {
    const { score, matchedSchool } = matchMemberScore(normalizedText, member)
    if (score <= 0) continue
    if (!best || score > best.score) {
      best = { member, score, matchedSchool }
    }
  }

  if (best && best.score >= 3) {
    return {
      related_member_name: best.member.name,
      related_member_type: best.member.type,
      kid_name: best.member.type === "child" ? best.member.name : null,
      school_name: best.member.type === "child" ? best.matchedSchool ?? best.member.school_name ?? best.member.daycare_name ?? null : null,
    }
  }

  if (
    /family|household|guardian|caregiver|parent(s)?|everyone|all students|all families|all parents/.test(
      normalizedText,
    )
  ) {
    return {
      related_member_name: "Family",
      related_member_type: "family",
      kid_name: null,
      school_name: null,
    }
  }

  return {
    related_member_name: null,
    related_member_type: null,
    kid_name: null,
    school_name: null,
  }
}
