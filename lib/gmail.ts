import { google } from "googleapis"
import Anthropic from "@anthropic-ai/sdk"
import type { RawFact, ScannedEvent } from "@/types"
import {
  buildContextSearchTerms,
  matchRelatedMember,
  summarizeHouseholdContext,
  type HouseholdScanContext,
} from "./household-scan"

type OrgType = "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | "other"

interface OrgInfo {
  name: string
  type: OrgType
  domain: string
}

export interface EmailScanResult {
  events: ScannedEvent[]
  organizations: OrgInfo[]
  facts: RawFact[]
  rawEmails: { id: string; subject: string; from: string; snippet: string }[]
  ai_unavailable_reason?: "credits" | "auth"
}

interface RawEmail {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  isCalendarInvite: boolean
}

interface AIExtracted {
  gmail_message_id: string
  event_type: ScannedEvent["event_type"]
  event_date: string | null
  start_time: string | null
  end_time: string | null
  related_member_name: string | null
  related_member_type: "adult" | "child" | "pet" | "family" | null
  kid_name: string | null
  grade: string | null
  school_name: string | null
  special_instructions: string | null
  urgency: "high" | "normal" | "low"
  auto_add_to_calendar: boolean
  calendar_title: string | null
  vendor: string | null
  amount: number | null
  recurrence: "monthly" | "annual" | "weekly" | "one_time" | null
  ai_processed: boolean
}

function quoteTerm(value: string): string {
  return `"${value.replace(/"/g, "").trim()}"`
}

function buildQueries(dateFilter: string, context: HouseholdScanContext) {
  const schoolTerms = context.members
    .flatMap((member) => [member.school_name, member.daycare_name])
    .filter((value): value is string => !!value?.trim())
    .map((value) => quoteTerm(value))
    .join(" OR ")

  const contextualTerms = buildContextSearchTerms(context)
  const contextQuery = contextualTerms.map((term) => quoteTerm(term)).join(" OR ")

  return {
    CALENDAR: `has:attachment filename:ics -category:promotions -category:social ${dateFilter}`,

    SCHOOL:
      "(from:(school OR academy OR nursery OR college OR daycare OR preschool OR schoolboard OR district" +
      (schoolTerms ? ` OR ${schoolTerms}` : "") +
      ") OR " +
      'subject:(school OR "parent teacher" OR "parent-teacher" OR "school trip" OR "field trip" OR ' +
      '"term dates" OR "half term" OR "school newsletter" OR "pick up" OR "drop off" OR ' +
      '"school event" OR "class update" OR "PTA" OR "school closure" OR "no school" OR ' +
      '"picture day" OR "orange shirt" OR "spirit day" OR "pajama day" OR "PA day" OR ' +
      '"report card" OR "permission" OR "hot lunch" OR "school council"' +
      (schoolTerms ? ` OR ${schoolTerms}` : "") +
      ")) " +
      `-category:promotions ${dateFilter}`,

    MEDICAL:
      "(from:(clinic OR medical OR dental OR dentist OR hospital OR pharmacy OR " +
      "health OR orthodont OR physio OR optician OR optometrist OR chiropractic OR massage OR " +
      'physiotherapy OR "eye care" OR ophthalmologist OR vet OR veterinary) OR ' +
      '(subject:(appointment OR prescription OR "test results" OR referral OR ' +
      '"health check" OR vaccination OR immunisation OR "eye exam" OR "dental cleaning" OR ' +
      '"physio appointment" OR "massage appointment" OR "follow-up" OR "vet visit" OR "pet exam"))) ' +
      `-category:promotions ${dateFilter}`,

    ACTIVITY:
      "(subject:(practice OR lesson OR class OR training OR session OR schedule OR reminder OR registration OR " +
      "tryout OR evaluation OR tournament OR game OR meet OR recital OR performance OR showcase OR concert) " +
      "OR (soccer OR football OR piano OR dance OR swim OR gymnastics OR karate OR " +
      "hockey OR basketball OR baseball OR softball OR volleyball OR tennis OR guitar OR violin OR " +
      "ballet OR lacrosse OR rugby OR cricket OR badminton)) " +
      `-category:promotions -category:social ${dateFilter}`,

    SUBSCRIPTION:
      '(subject:("subscription" OR "renewal" OR "receipt" OR "invoice" OR "payment confirmed" OR ' +
      '"billing" OR "order confirmation" OR "auto-renew" OR "charged" OR "your plan" OR ' +
      '"membership" OR "annual renewal" OR "free trial ending" OR "trial ends" OR "payment receipt") ' +
      "OR from:(netflix OR amazon OR spotify OR apple OR google OR disney OR hulu OR microsoft OR " +
      'adobe OR dropbox OR icloud OR youtube OR "prime video" OR nintendo OR xbox OR playstation OR ' +
      "paramount OR peacock OR crave OR duolingo OR audible OR kindle)) " +
      `${dateFilter}`,

    INVOICE:
      '(subject:("your receipt" OR "payment confirmation" OR "order confirmed" OR "order receipt" OR ' +
      '"invoice #" OR "invoice attached" OR "your invoice" OR "payment received" OR ' +
      '"transaction confirmed" OR "purchase confirmation" OR "booking confirmation" OR ' +
      '"your order" OR "order summary" OR "statement available" OR "bill ready")) ' +
      `${dateFilter}`,

    APPOINTMENT:
      '(subject:("appointment" OR "booking confirmation" OR "your booking" OR ' +
      '"appointment reminder" OR "your visit" OR "follow-up appointment" OR ' +
      '"session confirmed" OR "reservation confirmed" OR "confirmed appointment")) ' +
      `-category:promotions -category:social ${dateFilter}`,

    CONTEXTUAL:
      contextQuery
        ? `(${contextQuery}) -category:promotions -category:social ${dateFilter}`
        : "",
  }
}

function parseFromHeader(from: string): { name: string; domain: string } {
  const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/)
  const name = (match?.[1] ?? from).trim().replace(/"/g, "")
  const email = match?.[2] ?? ""
  const domain = email.includes("@") ? email.split("@")[1].toLowerCase() : ""
  return { name, domain }
}

function detectOrgType(name: string, domain: string, subject: string): OrgType {
  const haystack = `${name} ${domain} ${subject}`.toLowerCase()
  if (/dental|dentist|orthodont/.test(haystack)) return "dental"
  if (/pharmacy|chemist/.test(haystack)) return "pharmacy"
  if (/school|academy|nursery|preschool|daycare|kindergarten|primary|secondary|college|university|pta|schoolboard/.test(haystack)) return "school"
  if (/clinic|medical|hospital|gp|surgery|health|doctor|physio|optician|optometrist|nhs|massage|chiro|vet|veterinary/.test(haystack)) return "medical_clinic"
  if (/sport|football|soccer|rugby|basketball|swimming|gym|yoga|dance|martial|karate|gymnastics|hockey|tennis|baseball/.test(haystack)) return "sports"
  return "other"
}

function parseEventDate(dateStr: string): string | null {
  try {
    const date = new Date(dateStr)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  } catch {
    return null
  }
}

const PROMO_PATTERN = /% off|\bsale\b|discount|deal|special offer|promo|flash sale|limited time|free shipping/i
const FINANCIAL_PATTERN = /receipt|invoice|payment|order confirm|subscription|renewal|billing|charged|statement|transaction/i

function gmailDateFilter(since: Date | null): string {
  if (!since) {
    const date = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    return `after:${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
  }
  const date = new Date(since.getTime() - 24 * 60 * 60 * 1000)
  return `after:${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
}

async function aiExtractBatch(
  client: Anthropic,
  emails: RawEmail[],
  context: HouseholdScanContext,
): Promise<Map<string, AIExtracted>> {
  const householdSummary = summarizeHouseholdContext(context) || "No household context provided."

  const emailBlocks = emails
    .map(
      (email, index) =>
        `--- EMAIL ${index + 1} (id: ${email.id}) ---\nFrom: ${email.from}\nDate: ${email.date}\nSubject: ${email.subject}\nSnippet: ${email.snippet}`,
    )
    .join("\n\n")

  const prompt = `You are a family assistant extracting structured data from family emails for a parent dashboard.

Household context:
${householdSummary}

For each email, extract structured information. Return a JSON array with one object per email.

Event types:
- "school_event": school newsletters, general school communication, PTA, parent-teacher
- "field_trip": school outing or trip requiring permission/payment
- "no_school": school closed, PA day, holiday, no class, snow day
- "special_day": picture day, orange shirt day, spirit day, pajama day, costume day, hot lunch
- "medical": doctor, dentist, optician, physiotherapy, massage, eye clinic, veterinary, any health appointment
- "appointment": general booking confirmation not covered by medical
- "activity": kids activities - soccer practice, piano lesson, swimming, dance class, hockey, gymnastics, martial arts, etc.
- "recital": performance, tournament, competition, showcase, concert, graduation ceremony
- "subscription": Netflix, Amazon, Spotify, Apple, Disney+, any recurring digital service renewal/charge
- "invoice": one-time purchase receipt, order confirmation, e-commerce invoice, payment confirmation for goods/services
- "bill": utility bill, phone bill, insurance, internet, any non-subscription recurring charge
- "calendar_invite": email has a calendar attachment (.ics)
- "other": everything else

For each email return:
{
  "gmail_message_id": "<exact id from --- EMAIL N (id: ...) ---",
  "event_type": "<one of the types above>",
  "event_date": "YYYY-MM-DD" or null,
  "start_time": "HH:MM" 24h format or null,
  "end_time": "HH:MM" 24h format or null,
  "related_member_name": exact known adult/child/pet name, "Family", or null,
  "related_member_type": "adult", "child", "pet", "family", or null,
  "kid_name": exact child name from the household list or null,
  "grade": "Grade 3" / "JK" / "Grade 8" etc if mentioned, else null,
  "school_name": full school or daycare name if mentioned, else null,
  "special_instructions": what the child/parent needs to do/bring/wear e.g. "Wear orange shirt, bring $10 cash", or null,
  "urgency": "high" if action needed urgently or event is today/tomorrow, "normal" for upcoming events, "low" for FYI,
  "auto_add_to_calendar": true for field_trip/no_school/special_day/activity/recital/medical with a clear date,
  "calendar_title": short descriptive title e.g. "Emma - Soccer Practice" or "Netflix Renewal - $17.99" or null,
  "vendor": for subscription/bill only - service name e.g. "Netflix", "Amazon Prime", "Rogers", else null,
  "amount": for subscription/bill only - numeric dollar amount e.g. 17.99, else null,
  "recurrence": for subscription/bill - "monthly", "annual", "weekly", "one_time", else null
}

Rules:
- Match household member names case-insensitively and use exact casing from the household context
- Set kid_name only when the matched member is a child
- If the email is about the whole household or all parents/students, use related_member_name = "Family" and related_member_type = "family"
- auto_add_to_calendar = true only when there is a specific date AND the event requires action/attendance
- For subscriptions, extract the charge amount if visible in snippet
- special_instructions should be actionable parent notes only

Emails:
${emailBlocks}

Return ONLY a valid JSON array, no markdown, no explanation.`

  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  })

  let text = message.content[0].type === "text" ? message.content[0].text : "[]"
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  const parsed = JSON.parse(text) as AIExtracted[]
  const result = new Map<string, AIExtracted>()

  for (const item of parsed) {
    result.set(item.gmail_message_id, { ...item, ai_processed: true })
  }

  return result
}

function getAnthropicUnavailableReason(error: unknown): "credits" | "auth" | null {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/credit balance is too low/i.test(message)) return "credits"
  if (/api key|authentication|auth|permission|forbidden|unauthorized/i.test(message)) return "auth"
  return null
}

function regexExtract(email: RawEmail, context: HouseholdScanContext): Partial<ScannedEvent> {
  const haystack = `${email.from} ${email.subject} ${email.snippet}`.toLowerCase()
  let eventType: ScannedEvent["event_type"] = "other"

  if (email.isCalendarInvite) eventType = "calendar_invite"
  else if (/field.?trip/.test(haystack)) eventType = "field_trip"
  else if (/no.school|school.closed|pa.day|snow.day/.test(haystack)) eventType = "no_school"
  else if (/picture.day|photo.day|orange.shirt|spirit.day|pajama|costume|hot.lunch/.test(haystack)) eventType = "special_day"
  else if (/netflix|amazon.prime|spotify|disney|hulu|subscription|renewal|auto.renew/.test(haystack)) eventType = "subscription"
  else if (/bill|statement available|insurance|internet|utility|hydro|phone bill/.test(haystack)) eventType = "bill"
  else if (/receipt|invoice|order confirmed|payment confirmation|transaction confirmed/.test(haystack)) eventType = "invoice"
  else if (/recital|tournament|competition|showcase|performance|concert/.test(haystack)) eventType = "recital"
  else if (/soccer|piano|dance|swim|gymnastics|karate|hockey|basketball|baseball|tennis|lesson|practice/.test(haystack)) eventType = "activity"
  else if (/school|pta|parent.teacher|term|daycare|preschool/.test(haystack)) eventType = "school_event"
  else if (/dental|doctor|clinic|hospital|medical|physio|optician|massage|eye.clinic|vet|veterinary/.test(haystack)) eventType = "medical"
  else if (/appointment|booking|reservation/.test(haystack)) eventType = "appointment"

  const relatedMatch = matchRelatedMember(`${email.from} ${email.subject} ${email.snippet}`, context)
  const urgency: ScannedEvent["urgency"] =
    /urgent|important|action required|reminder|today|tomorrow|deadline/.test(haystack) ? "high" : "normal"

  const fallbackFamily =
    eventType === "subscription" || eventType === "invoice" || eventType === "bill"
      ? { related_member_name: "Family", related_member_type: "family" as const }
      : { related_member_name: null, related_member_type: null }

  return {
    event_type: eventType,
    related_member_name: relatedMatch.related_member_name ?? fallbackFamily.related_member_name,
    related_member_type: relatedMatch.related_member_type ?? fallbackFamily.related_member_type,
    kid_name: relatedMatch.kid_name,
    urgency,
    ai_processed: false,
    start_time: null,
    end_time: null,
    grade: null,
    school_name: relatedMatch.school_name,
    special_instructions: null,
    auto_add_to_calendar: false,
    calendar_title: null,
    vendor: null,
    amount: null,
    recurrence: null,
  }
}

export async function scanEmails(
  accessToken: string,
  context: HouseholdScanContext,
  lastScanDate: Date | null = null,
  alreadyProcessedIds: Set<string> = new Set(),
): Promise<EmailScanResult> {
  const oauthClient = new google.auth.OAuth2()
  oauthClient.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: "v1", auth: oauthClient })

  const anthropic =
    process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null

  const dateFilter = gmailDateFilter(lastScanDate)
  const queries = buildQueries(dateFilter, context)
  const isFirstScan = lastScanDate === null

  const seenIds = new Set<string>()
  const rawEmails: RawEmail[] = []
  const orgMap = new Map<string, OrgInfo>()
  let aiUnavailableReason: "credits" | "auth" | undefined

  async function fetchQuery(query: string, isCalendarInvite: boolean, isFinancial = false) {
    if (!query) return

    const maxResults = isFirstScan ? 100 : 50
    const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults })
    const messages = list.data.messages ?? []

    for (const message of messages.slice(0, isFirstScan ? 80 : 40)) {
      if (!message.id || seenIds.has(message.id)) continue
      seenIds.add(message.id)

      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "metadata",
        metadataHeaders: ["Subject", "Date", "From"],
      })

      const headers = detail.data.payload?.headers ?? []
      const subject = headers.find((header) => header.name === "Subject")?.value ?? "(no subject)"
      const date = headers.find((header) => header.name === "Date")?.value ?? ""
      const from = headers.find((header) => header.name === "From")?.value ?? ""
      const snippet = detail.data.snippet ?? ""

      const looksFinancial = FINANCIAL_PATTERN.test(subject) || FINANCIAL_PATTERN.test(snippet)
      if (!isFinancial && !looksFinancial && PROMO_PATTERN.test(subject)) continue

      const { name: orgName, domain } = parseFromHeader(from)
      const orgType = detectOrgType(orgName, domain, subject)
      if (domain && !orgMap.has(domain)) {
        orgMap.set(domain, { name: orgName, type: orgType, domain })
      }

      rawEmails.push({
        id: message.id,
        subject,
        from,
        date,
        snippet: snippet.slice(0, 500),
        isCalendarInvite,
      })
    }
  }

  await fetchQuery(queries.CALENDAR, true)
  await fetchQuery(queries.SCHOOL, false)
  await fetchQuery(queries.MEDICAL, false)
  await fetchQuery(queries.ACTIVITY, false)
  await fetchQuery(queries.SUBSCRIPTION, false, true)
  await fetchQuery(queries.INVOICE, false, true)
  await fetchQuery(queries.APPOINTMENT, false)
  await fetchQuery(queries.CONTEXTUAL, false)

  const needsAI = rawEmails.filter((email) => !alreadyProcessedIds.has(email.id))
  const aiMap = new Map<string, AIExtracted>()

  if (anthropic && needsAI.length > 0) {
    const batchSize = 8
    for (let index = 0; index < needsAI.length; index += batchSize) {
      const batch = needsAI.slice(index, index + batchSize)
      try {
        const batchResult = await aiExtractBatch(anthropic, batch, context)
        for (const [key, value] of batchResult) aiMap.set(key, value)
      } catch (error) {
        console.error("[gmail/ai] batch error", error instanceof Error ? error.message : error)
        const unavailableReason = getAnthropicUnavailableReason(error)
        if (unavailableReason) {
          aiUnavailableReason = unavailableReason
          break
        }
      }
    }
  }

  const allEvents: ScannedEvent[] = rawEmails.map((email) => {
    const { name: orgName, domain } = parseFromHeader(email.from)
    const orgType = detectOrgType(orgName, domain, email.subject)
    const ai = aiMap.get(email.id)
    const fallback = regexExtract(email, context)
    const alreadyProcessed = alreadyProcessedIds.has(email.id)

    return {
      gmail_message_id: email.id,
      title: email.subject,
      event_date: ai?.event_date ? `${ai.event_date}T00:00:00.000Z` : parseEventDate(email.date),
      start_time: ai?.start_time ?? null,
      end_time: ai?.end_time ?? null,
      event_type: ai?.event_type ?? fallback.event_type ?? "other",
      organization_name: orgName || null,
      organization_type: orgType === "other" ? null : orgType,
      source_from: email.from,
      snippet: email.snippet,
      related_member_name: ai?.related_member_name ?? fallback.related_member_name ?? null,
      related_member_type: ai?.related_member_type ?? fallback.related_member_type ?? null,
      kid_name: ai?.kid_name ?? fallback.kid_name ?? null,
      grade: ai?.grade ?? null,
      school_name: ai?.school_name ?? fallback.school_name ?? null,
      special_instructions: ai?.special_instructions ?? null,
      urgency: ai?.urgency ?? fallback.urgency ?? "normal",
      auto_add_to_calendar: ai?.auto_add_to_calendar ?? false,
      calendar_title: ai?.calendar_title ?? null,
      ai_processed: ai != null || alreadyProcessed,
      vendor: ai?.vendor ?? null,
      amount: ai?.amount ?? null,
      recurrence: ai?.recurrence ?? null,
    }
  })

  const toSave = allEvents.filter(
    (event) =>
      !alreadyProcessedIds.has(event.gmail_message_id) ||
      aiMap.has(event.gmail_message_id),
  )

  allEvents.sort((left, right) => {
    if (!left.event_date && !right.event_date) return 0
    if (!left.event_date) return 1
    if (!right.event_date) return -1
    return new Date(right.event_date).getTime() - new Date(left.event_date).getTime()
  })

  return {
    events: toSave,
    organizations: Array.from(orgMap.values()).filter((org) => org.type !== "other"),
    facts: [],
    rawEmails: needsAI.map((email) => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      snippet: email.snippet,
    })),
    ai_unavailable_reason: aiUnavailableReason,
  }
}
