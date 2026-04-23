import Anthropic from "@anthropic-ai/sdk"
import type { RawFact, FamilyFact, FactPredicate } from "@/types"

// ── Predicate metadata ────────────────────────────────────────────────────────

export const PREDICATE_META: Record<FactPredicate, { label: string; icon: string; group: string }> = {
  attends_school:  { label: "School / Nursery", icon: "🏫", group: "education"   },
  current_grade:   { label: "Grade",            icon: "📚", group: "education"   },
  participates_in: { label: "Activities",        icon: "⚽", group: "activities"  },
  taught_by:       { label: "Instructor",        icon: "👩‍🏫", group: "activities"  },
  sees_doctor:     { label: "Doctor / Clinic",   icon: "🩺", group: "healthcare"  },
  sees_dentist:    { label: "Dentist",           icon: "🦷", group: "healthcare"  },
  uses_pharmacy:   { label: "Pharmacy",          icon: "💊", group: "healthcare"  },
  subscribes_to:   { label: "Subscriptions",     icon: "💳", group: "services"   },
  pays_bill:       { label: "Bills",             icon: "📄", group: "services"   },
  serves_grades:   { label: "Grade Range",       icon: "📐", group: "institution" },
}

export const FACT_GROUPS = [
  { id: "education",   label: "Education",   icon: "🏫", predicates: ["attends_school", "current_grade"]   as FactPredicate[] },
  { id: "activities",  label: "Activities",  icon: "⚽", predicates: ["participates_in", "taught_by"]      as FactPredicate[] },
  { id: "healthcare",  label: "Healthcare",  icon: "🩺", predicates: ["sees_doctor", "sees_dentist", "uses_pharmacy"] as FactPredicate[] },
  { id: "services",    label: "Services",    icon: "💳", predicates: ["subscribes_to", "pays_bill"]        as FactPredicate[] },
]

// ── AI extraction ─────────────────────────────────────────────────────────────

interface RawEmail {
  id: string
  subject: string
  from: string
  snippet: string
}

interface FamilyMember {
  name: string
  type: "kid" | "parent"
  dob?: string | null
  school_name?: string | null
  grade?: string | null
}

function computeGradeLabel(dob: string | null | undefined): string {
  if (!dob) return ""
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return ""
  const now = new Date()
  const schoolYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  const grade = schoolYear - birth.getFullYear() - 5
  if (grade < 0) return "not yet school age"
  if (grade === 0) return "Kindergarten"
  return `Grade ${grade}`
}

export async function aiExtractFacts(
  client: Anthropic,
  emails: RawEmail[],
  members: FamilyMember[]
): Promise<RawFact[]> {
  const familyDesc = members.map((m) => {
    const gradeHint = m.grade ? ` — ${m.grade}` : (m.type === "kid" && m.dob ? ` — currently ${computeGradeLabel(m.dob)}` : "")
    const schoolHint = m.school_name ? ` at ${m.school_name}` : ""
    return `- ${m.type === "parent" ? "Parent" : "Child"}: ${m.name}${gradeHint}${schoolHint}`
  }).join("\n")

  const emailBlocks = emails.map((e, i) =>
    `--- EMAIL ${i + 1} (id: ${e.id}) ---\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
  ).join("\n\n")

  const prompt = `You are extracting PERSISTENT FACTS about a family from their emails. Facts are durable truths — not one-time events.

Family members:
${familyDesc}

Predicate taxonomy (use ONLY these exact strings):
- "attends_school"   → which school/nursery/daycare a child attends
- "current_grade"    → grade level e.g. "Grade 6", "JK", "SK", "Grade 9"
- "participates_in"  → sport, music, arts, club NAME e.g. "Piano", "Soccer", "Ballet" — use for organizations/activities, NOT for person names
- "taught_by"        → teacher, tutor, coach, instructor PERSON name e.g. "Gloria Bieker", "Coach Smith"
- "sees_doctor"      → doctor or medical clinic name (not dentist)
- "sees_dentist"     → dental clinic or dentist name
- "uses_pharmacy"    → pharmacy name
- "subscribes_to"    → digital subscription e.g. "Netflix $17.99/month"
- "pays_bill"        → recurring bill e.g. "Rogers $80/month", "Shaw Internet"
- "serves_grades"    → ONLY for subject_type="institution": grade range this school serves e.g. "4-9", "K-6", "JK-8"

Rules:
- Subject must be an exact name from the family list, or the institution name (for serves_grades)
- Do NOT use "family" as subject — assign to the parent name for dental, subscriptions, bills, pharmacy
- subject_type: "kid", "parent", or "institution"
- Confidence: 0.9+ = explicitly stated, 0.7–0.89 = strongly implied, 0.5–0.69 = possible, skip below 0.5
- Do NOT extract one-time events as facts (a school trip is not attends_school)
- If an email is from a school, extract serves_grades if any grade range is mentioned or implied
- Subscriptions and bills: include price and frequency in the object string if visible

Emails:
${emailBlocks}

Return ONLY a valid JSON array of fact objects:
[{ "gmail_message_id": "...", "subject": "...", "subject_type": "...", "predicate": "...", "object": "...", "confidence": 0.0 }]
No markdown, no explanation.`

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })
    let text = message.content[0].type === "text" ? message.content[0].text : "[]"
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(text) as RawFact[]
    return parsed.filter((f) =>
      f.gmail_message_id && f.subject && f.subject_type && f.predicate && f.object && f.confidence >= 0.5
    )
  } catch (err) {
    console.error("[facts/ai] extraction error", err instanceof Error ? err.message : err)
    return []
  }
}

// ── Seeding facts from existing scanned_events (no AI needed) ────────────────

interface ScannedEventLike {
  gmail_message_id: string
  event_type: string
  organization_type: string | null
  organization_name: string | null
  school_name: string | null
  grade: string | null
  kid_name: string | null
  vendor: string | null
  amount: number | null
  recurrence: string | null
}

const SCHOOL_EVENT_TYPES = ["school_event", "field_trip", "no_school", "special_day"]
const ACTIVITY_EVENT_TYPES = ["activity", "recital"]

export function seedFactsFromEvents(
  events: ScannedEventLike[],
  members: FamilyMember[]
): RawFact[] {
  const facts: RawFact[] = []
  const kidNames = new Set(members.filter((m) => m.type === "kid").map((m) => m.name.toLowerCase()))
  const parentName = members.find((m) => m.type === "parent")?.name ?? "Parent"

  // Pre-collect all school names so we can avoid duplicating them as activities
  const knownSchoolNames = new Set<string>()
  for (const e of events) {
    if (SCHOOL_EVENT_TYPES.includes(e.event_type)) {
      const school = (e.school_name ?? e.organization_name ?? "").trim().toLowerCase()
      if (school) knownSchoolNames.add(school)
    }
  }

  for (const e of events) {
    const mid = e.gmail_message_id

    // School attendance
    if (SCHOOL_EVENT_TYPES.includes(e.event_type) && e.kid_name && kidNames.has(e.kid_name.toLowerCase())) {
      const school = (e.school_name ?? e.organization_name ?? "").trim()
      if (school) {
        facts.push({ gmail_message_id: mid, subject: e.kid_name, subject_type: "kid", predicate: "attends_school", object: school, confidence: 0.72 })
      }
      if (e.grade) {
        facts.push({ gmail_message_id: mid, subject: e.kid_name, subject_type: "kid", predicate: "current_grade", object: e.grade, confidence: 0.78 })
        // Also derive institution grade range hint from grade + school
        if (school) {
          facts.push({ gmail_message_id: mid, subject: school, subject_type: "institution", predicate: "serves_grades", object: e.grade, confidence: 0.65 })
        }
      }
    }

    // Activity participation — only for emails directly attributed to a specific kid
    if (ACTIVITY_EVENT_TYPES.includes(e.event_type) && e.organization_name && e.kid_name && kidNames.has(e.kid_name.toLowerCase())) {
      const orgName = e.organization_name.trim()
      // Skip if the org name is already known as a school (prevents Education/Activities duplicate)
      if (knownSchoolNames.has(orgName.toLowerCase())) continue
      // A "First Last" pattern = person name → this is an instructor, not an activity
      const looksLikePerson = /^[A-Z][a-z]+([ '-][A-Z][a-z]+)+$/.test(orgName)
      const predicate: FactPredicate = looksLikePerson ? "taught_by" : "participates_in"
      facts.push({ gmail_message_id: mid, subject: e.kid_name, subject_type: "kid", predicate, object: orgName, confidence: 0.70 })
    }

    // Medical — doctor/clinic — assigned to parent if unattributed (parent manages family health)
    if (e.event_type === "medical" && e.organization_name) {
      const subject = e.kid_name && kidNames.has(e.kid_name.toLowerCase()) ? e.kid_name : parentName
      const subType: "kid" | "parent" = subject === parentName ? "parent" : "kid"
      facts.push({ gmail_message_id: mid, subject, subject_type: subType, predicate: "sees_doctor", object: e.organization_name, confidence: 0.75 })
    }

    // Dental — assigned to parent (parent manages family dental)
    if (e.organization_type === "dental" && e.organization_name) {
      facts.push({ gmail_message_id: mid, subject: parentName, subject_type: "parent", predicate: "sees_dentist", object: e.organization_name, confidence: 0.80 })
    }

    // Pharmacy — assigned to parent
    if (e.organization_type === "pharmacy" && e.organization_name) {
      facts.push({ gmail_message_id: mid, subject: parentName, subject_type: "parent", predicate: "uses_pharmacy", object: e.organization_name, confidence: 0.78 })
    }

    // Subscriptions & bills — assigned to parent (parent pays)
    if ((e.event_type === "subscription" || e.event_type === "bill") && e.vendor) {
      const freq = e.recurrence === "monthly" ? "/mo" : e.recurrence === "annual" ? "/yr" : ""
      const obj = e.amount ? `${e.vendor} $${Number(e.amount).toFixed(2)}${freq}` : e.vendor
      const predicate: FactPredicate = e.event_type === "subscription" ? "subscribes_to" : "pays_bill"
      facts.push({ gmail_message_id: mid, subject: parentName, subject_type: "parent", predicate, object: obj, confidence: 0.80 })
    }
  }

  return facts
}

// ── Conflict resolution ───────────────────────────────────────────────────────

interface KidInfo { name: string; dob: string | null }

function parseGradeNum(g: string): number | null {
  const l = g.toLowerCase()
  if (/junior.?kinder|jk/.test(l)) return -1
  if (/senior.?kinder|sk/.test(l)) return 0
  if (/kinder/.test(l)) return 0
  const m = g.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

function dobToGrade(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  const schoolYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return schoolYear - birth.getFullYear() - 5
}

// Parses "4-9", "K-6", "JK-8", "Grade 6" etc. to a numeric range
function parseGradeRange(obj: string): { min: number; max: number } | null {
  const clean = obj.trim()
  // Range like "4-9" or "K-6" or "JK-8"
  const rangeMatch = clean.match(/^([A-Za-z0-9]+)[-–to]+([A-Za-z0-9]+)$/)
  if (rangeMatch) {
    const lo = parseGradeNum(rangeMatch[1])
    const hi = parseGradeNum(rangeMatch[2])
    if (lo !== null && hi !== null) return { min: lo, max: hi }
  }
  // Single grade like "Grade 6"
  const single = parseGradeNum(clean)
  if (single !== null) return { min: single - 1, max: single + 1 }
  return null
}

export function resolveConflicts(
  facts: FamilyFact[],
  kids: KidInfo[]
): { id: string; status: "confirmed" | "uncertain" | "conflicted" }[] {
  const updates: { id: string; status: "confirmed" | "uncertain" | "conflicted" }[] = []

  // Build school → grade range from institution facts
  const schoolRanges = new Map<string, { min: number; max: number }>()
  for (const f of facts) {
    if (f.subject_type === "institution" && f.predicate === "serves_grades") {
      const range = parseGradeRange(f.object)
      if (range) {
        const existing = schoolRanges.get(f.subject.toLowerCase())
        schoolRanges.set(f.subject.toLowerCase(), {
          min: existing ? Math.min(existing.min, range.min) : range.min,
          max: existing ? Math.max(existing.max, range.max) : range.max,
        })
      }
    }
  }

  // Also build school range from current_grade facts (if no explicit serves_grades)
  const gradesBySchool = new Map<string, number[]>()
  for (const f of facts) {
    if (f.predicate === "attends_school") {
      // For each kid attending this school, collect their grade
      const kidGrade = facts.find(
        (g) => g.subject === f.subject && g.predicate === "current_grade" && g.status !== "conflicted"
      )
      if (kidGrade) {
        const g = parseGradeNum(kidGrade.object)
        if (g !== null) {
          const schoolKey = f.object.toLowerCase()
          const arr = gradesBySchool.get(schoolKey) ?? []
          arr.push(g)
          gradesBySchool.set(schoolKey, arr)
        }
      }
    }
  }
  // Merge gradesBySchool into schoolRanges if no explicit range
  for (const [school, grades] of gradesBySchool) {
    if (!schoolRanges.has(school) && grades.length > 0) {
      schoolRanges.set(school, { min: Math.min(...grades), max: Math.max(...grades) })
    }
  }

  // Build kid name → DOB grade map
  const kidGrades = new Map<string, number | null>()
  for (const k of kids) kidGrades.set(k.name.toLowerCase(), dobToGrade(k.dob))

  for (const f of facts) {
    let status: "confirmed" | "uncertain" | "conflicted" = "confirmed"

    // Low confidence → uncertain
    if (f.confidence < 0.6) {
      status = "uncertain"
    }

    // Grade conflict: kid attends school whose grade range doesn't match DOB-derived grade
    if (f.predicate === "attends_school" && f.subject_type === "kid") {
      const kidGrade = kidGrades.get(f.subject.toLowerCase())
      const schoolRange = schoolRanges.get(f.object.toLowerCase())
      if (kidGrade !== null && kidGrade !== undefined && schoolRange) {
        if (kidGrade < schoolRange.min - 1 || kidGrade > schoolRange.max + 1) {
          status = "conflicted"
        }
      }
    }

    // Grade conflict: kid's claimed current_grade vs DOB-derived grade (allow ±2 for late/early)
    if (f.predicate === "current_grade" && f.subject_type === "kid") {
      const kidGrade = kidGrades.get(f.subject.toLowerCase())
      const claimedGrade = parseGradeNum(f.object)
      if (kidGrade !== null && kidGrade !== undefined && claimedGrade !== null) {
        if (Math.abs(kidGrade - claimedGrade) > 2) {
          status = "conflicted"
        }
      }
    }

    if (status !== f.status) updates.push({ id: f.id, status })
  }

  return updates
}
