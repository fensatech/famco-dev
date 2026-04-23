import { google } from "googleapis"
import Anthropic from "@anthropic-ai/sdk"
import type { ScannedEvent, RawFact } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgType = "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | "other"

interface OrgInfo { name: string; type: OrgType; domain: string }

export interface KidInfo { name: string; grade?: string | null; school_name?: string | null }

export interface EmailScanResult {
  events: ScannedEvent[]
  organizations: OrgInfo[]
  facts: RawFact[]
  rawEmails: { id: string; subject: string; from: string; snippet: string }[]
}

interface RawEmail {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  isCalendarInvite: boolean
}

// ── Gmail queries (all use date filter injected at runtime) ───────────────────

function buildQueries(dateFilter: string, knownSchools: string[] = []) {
  const schoolNames = knownSchools.filter(Boolean).map((s) => `"${s}"`).join(" OR ")
  return {
    CALENDAR: `has:attachment filename:ics -category:promotions -category:social ${dateFilter}`,

    SCHOOL:
      "(from:(school OR academy OR nursery OR college OR daycare OR preschool OR schoolboard OR district" +
      (schoolNames ? ` OR ${schoolNames}` : "") + ") OR " +
      'subject:(school OR "parent teacher" OR "parent-teacher" OR "school trip" OR "field trip" OR ' +
      '"term dates" OR "half term" OR "school newsletter" OR "pick up" OR "drop off" OR ' +
      '"school event" OR "class update" OR "PTA" OR "school closure" OR "no school" OR ' +
      '"picture day" OR "orange shirt" OR "spirit day" OR "pajama day" OR "PA day" OR ' +
      '"report card" OR "permission" OR "hot lunch" OR "school council"' +
      (schoolNames ? ` OR ${schoolNames}` : "") + ")) " +
      `-category:promotions ${dateFilter}`,

    MEDICAL:
      "(from:(clinic OR medical OR dental OR dentist OR hospital OR pharmacy OR " +
      "health OR orthodont OR physio OR optician OR optometrist OR chiropractic OR massage OR " +
      "physiotherapy OR \"eye care\" OR ophthalmologist) OR " +
      '(subject:(appointment OR prescription OR "test results" OR referral OR ' +
      '"health check" OR vaccination OR immunisation OR "eye exam" OR "dental cleaning" OR ' +
      '"physio appointment" OR "massage appointment" OR "follow-up"))) ' +
      `-category:promotions ${dateFilter}`,

    ACTIVITY:
      "(subject:(practice OR lesson OR class OR training OR session OR schedule OR reminder OR registration OR " +
      "tryout OR evaluation OR tournament OR game OR meet OR recital OR performance OR showcase OR concert) " +
      "OR (soccer OR football OR piano OR dance OR swim OR gymnastics OR karate OR " +
      "hockey OR basketball OR baseball OR softball OR volleyball OR tennis OR guitar OR violin OR " +
      "ballet OR lacrosse OR rugby OR cricket OR badminton)) " +
      `-category:promotions -category:social ${dateFilter}`,

    // No -category:promotions — subscription receipts land in Gmail's Promotions tab
    SUBSCRIPTION:
      '(subject:("subscription" OR "renewal" OR "receipt" OR "invoice" OR "payment confirmed" OR ' +
      '"billing" OR "order confirmation" OR "auto-renew" OR "charged" OR "your plan" OR ' +
      '"membership" OR "annual renewal" OR "free trial ending" OR "trial ends" OR "payment receipt") ' +
      "OR from:(netflix OR amazon OR spotify OR apple OR google OR disney OR hulu OR microsoft OR " +
      "adobe OR dropbox OR icloud OR youtube OR \"prime video\" OR nintendo OR xbox OR playstation OR " +
      "paramount OR peacock OR crave OR duolingo OR audible OR kindle)) " +
      `${dateFilter}`,

    // Catch payment confirmations, order receipts, e-commerce invoices
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
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFromHeader(from: string): { name: string; domain: string } {
  const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/)
  const name = (match?.[1] ?? from).trim().replace(/"/g, "")
  const email = match?.[2] ?? ""
  const domain = email.includes("@") ? email.split("@")[1].toLowerCase() : ""
  return { name, domain }
}

function detectOrgType(name: string, domain: string, subject: string): OrgType {
  const h = `${name} ${domain} ${subject}`.toLowerCase()
  if (/dental|dentist|orthodont/.test(h)) return "dental"
  if (/pharmacy|chemist/.test(h)) return "pharmacy"
  if (/school|academy|nursery|preschool|daycare|kindergarten|primary|secondary|college|university|pta|schoolboard/.test(h)) return "school"
  if (/clinic|medical|hospital|gp|surgery|health|doctor|physio|optician|optometrist|nhs|massage|chiro/.test(h)) return "medical_clinic"
  if (/sport|football|soccer|rugby|basketball|swimming|gym|yoga|dance|martial|karate|gymnastics|hockey|tennis|baseball/.test(h)) return "sports"
  return "other"
}

function parseEventDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

// "unsubscribe" intentionally excluded — all receipts/invoices have an unsubscribe footer
const PROMO_PATTERN =
  /% off|\bsale\b|discount|deal|special offer|promo|flash sale|limited time|free shipping/i

// Financial emails should skip the promo filter — receipts from Amazon, Apple etc. look promotional
const FINANCIAL_PATTERN =
  /receipt|invoice|payment|order confirm|subscription|renewal|billing|charged|statement|transaction/i

function gmailDateFilter(since: Date | null): string {
  if (!since) {
    // First scan: 6 months back
    const d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    return `after:${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
  }
  // Incremental: since last scan (back 1 day for safety overlap)
  const d = new Date(since.getTime() - 24 * 60 * 60 * 1000)
  return `after:${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

// ── AI extraction ─────────────────────────────────────────────────────────────

interface AIExtracted {
  gmail_message_id: string
  event_type: ScannedEvent["event_type"]
  event_date: string | null
  start_time: string | null
  end_time: string | null
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

async function aiExtractBatch(
  client: Anthropic,
  emails: RawEmail[],
  kids: KidInfo[]
): Promise<Map<string, AIExtracted>> {
  const kidList = kids.length > 0
    ? `Known family members: ${kids.map((k) => `${k.name}${k.grade ? ` (${k.grade})` : ""}`).join(", ")}.`
    : "No known family members provided."

  const emailBlocks = emails.map((e, i) =>
    `--- EMAIL ${i + 1} (id: ${e.id}) ---\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\nSnippet: ${e.snippet}`
  ).join("\n\n")

  const prompt = `You are a family assistant extracting structured data from family emails for a parent dashboard.

${kidList}

For each email, extract structured information. Return a JSON array with one object per email.

Event types:
- "school_event": school newsletters, general school communication, PTA, parent-teacher
- "field_trip": school outing or trip requiring permission/payment
- "no_school": school closed, PA day, holiday, no class, snow day
- "special_day": picture day, orange shirt day, spirit day, pajama day, costume day, hot lunch
- "medical": doctor, dentist, optician, physiotherapy, massage, eye clinic, any health appointment
- "appointment": general booking confirmation not covered by medical
- "activity": kids activities — soccer practice, piano lesson, swimming, dance class, hockey, gymnastics, martial arts, etc.
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
  "kid_name": name matching a known family member or null,
  "grade": "Grade 3" / "JK" / "Grade 8" etc if mentioned, else null,
  "school_name": full school name if mentioned, else null,
  "special_instructions": what the child/parent needs to do/bring/wear e.g. "Wear orange shirt, bring $10 cash", or null,
  "urgency": "high" if action needed urgently or event is today/tomorrow, "normal" for upcoming events, "low" for FYI,
  "auto_add_to_calendar": true for field_trip/no_school/special_day/activity/recital/medical with a clear date,
  "calendar_title": short descriptive title e.g. "Emma - Soccer Practice" or "Netflix Renewal - $17.99" or null,
  "vendor": for subscription/bill only — service name e.g. "Netflix", "Amazon Prime", "Rogers", else null,
  "amount": for subscription/bill only — numeric dollar amount e.g. 17.99, else null,
  "recurrence": for subscription/bill — "monthly", "annual", "weekly", "one_time", else null
}

Rules:
- Match kid names case-insensitively; use exact casing from the family list
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
  const parsed: AIExtracted[] = JSON.parse(text)
  const resultMap = new Map<string, AIExtracted>()
  for (const item of parsed) {
    resultMap.set(item.gmail_message_id, { ...item, ai_processed: true })
  }
  return resultMap
}

// ── Regex fallback ────────────────────────────────────────────────────────────

function regexExtract(email: RawEmail, kids: KidInfo[]): Partial<ScannedEvent> {
  const h = `${email.subject} ${email.snippet}`.toLowerCase()
  let event_type: ScannedEvent["event_type"] = "other"
  if (email.isCalendarInvite) event_type = "calendar_invite"
  else if (/field.?trip/.test(h)) event_type = "field_trip"
  else if (/no.school|school.closed|pa.day|snow.day/.test(h)) event_type = "no_school"
  else if (/picture.day|photo.day|orange.shirt|spirit.day|pajama|costume|hot.lunch/.test(h)) event_type = "special_day"
  else if (/netflix|amazon.prime|spotify|disney|hulu|subscription|renewal|auto.renew/.test(h)) event_type = "subscription"
  else if (/recital|tournament|competition|showcase|performance|concert/.test(h)) event_type = "recital"
  else if (/soccer|piano|dance|swim|gymnastics|karate|hockey|basketball|baseball|tennis|lesson|practice/.test(h)) event_type = "activity"
  else if (/school|pta|parent.teacher|term/.test(h)) event_type = "school_event"
  else if (/dental|doctor|clinic|hospital|medical|physio|optician|massage|eye.clinic/.test(h)) event_type = "medical"
  else if (/appointment|booking|reservation/.test(h)) event_type = "appointment"

  let kid_name: string | null = null
  for (const kid of kids) {
    if (h.includes(kid.name.toLowerCase())) { kid_name = kid.name; break }
  }

  const urgency: ScannedEvent["urgency"] =
    /urgent|important|action required|reminder|today|tomorrow|deadline/.test(h) ? "high" : "normal"

  return {
    event_type, kid_name, urgency, ai_processed: false,
    start_time: null, end_time: null, grade: null, school_name: null,
    special_instructions: null, auto_add_to_calendar: false, calendar_title: null,
    vendor: null, amount: null, recurrence: null,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scanEmails(
  accessToken: string,
  kids: KidInfo[] = [],
  lastScanDate: Date | null = null,
  alreadyProcessedIds: Set<string> = new Set()
): Promise<EmailScanResult> {
  const oauthClient = new google.auth.OAuth2()
  oauthClient.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: "v1", auth: oauthClient })

  const useAI = !!process.env.ANTHROPIC_API_KEY
  const anthropic = useAI ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null

  const dateFilter = gmailDateFilter(lastScanDate)
  const knownSchools = kids.map((k) => k.school_name).filter((s): s is string => !!s)
  const queries = buildQueries(dateFilter, knownSchools)
  const isFirstScan = lastScanDate === null

  const seenIds = new Set<string>()
  const rawEmails: RawEmail[] = []
  const orgMap = new Map<string, OrgInfo>()

  async function fetchQuery(query: string, isCalendarInvite: boolean, isFinancial = false) {
    const maxResults = isFirstScan ? 100 : 50
    const list = await gmail.users.messages.list({ userId: "me", q: query, maxResults })
    const messages = list.data.messages ?? []

    for (const msg of messages.slice(0, isFirstScan ? 80 : 40)) {
      if (!msg.id || seenIds.has(msg.id)) continue
      seenIds.add(msg.id)

      const detail = await gmail.users.messages.get({
        userId: "me", id: msg.id, format: "metadata",
        metadataHeaders: ["Subject", "Date", "From"],
      })

      const headers = detail.data.payload?.headers ?? []
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)"
      const date = headers.find((h) => h.name === "Date")?.value ?? ""
      const from = headers.find((h) => h.name === "From")?.value ?? ""
      const snippet = detail.data.snippet ?? ""

      // Financial emails: skip promo filter if subject/snippet looks like a receipt/invoice
      const looksFinancial = FINANCIAL_PATTERN.test(subject) || FINANCIAL_PATTERN.test(snippet)
      if (!isFinancial && !looksFinancial && PROMO_PATTERN.test(subject)) continue

      const { name: orgName, domain } = parseFromHeader(from)
      const orgType = detectOrgType(orgName, domain, subject)
      if (domain && !orgMap.has(domain)) orgMap.set(domain, { name: orgName, type: orgType, domain })

      rawEmails.push({ id: msg.id, subject, from, date, snippet: snippet.slice(0, 500), isCalendarInvite })
    }
  }

  await fetchQuery(queries.CALENDAR, true)
  await fetchQuery(queries.SCHOOL, false)
  await fetchQuery(queries.MEDICAL, false)
  await fetchQuery(queries.ACTIVITY, false)
  await fetchQuery(queries.SUBSCRIPTION, false, true)
  await fetchQuery(queries.INVOICE, false, true)
  await fetchQuery(queries.APPOINTMENT, false)

  // Only AI-process emails not already processed
  const needsAI = rawEmails.filter((e) => !alreadyProcessedIds.has(e.id))
  const skipAI = rawEmails.filter((e) => alreadyProcessedIds.has(e.id))

  const aiMap = new Map<string, AIExtracted>()
  if (anthropic && needsAI.length > 0) {
    const BATCH = 8
    for (let i = 0; i < needsAI.length; i += BATCH) {
      const batch = needsAI.slice(i, i + BATCH)
      try {
        const batchResult = await aiExtractBatch(anthropic, batch, kids)
        for (const [k, v] of batchResult) aiMap.set(k, v)
      } catch (err) {
        console.error("[gmail/ai] batch error", err instanceof Error ? err.message : err)
      }
    }
  }

  const allEvents: ScannedEvent[] = rawEmails.map((email) => {
    const { name: orgName, domain } = parseFromHeader(email.from)
    const orgType = detectOrgType(orgName, domain, email.subject)
    const ai = aiMap.get(email.id)
    const fallback = regexExtract(email, kids)
    const alreadyDone = alreadyProcessedIds.has(email.id)

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
      kid_name: ai?.kid_name ?? fallback.kid_name ?? null,
      grade: ai?.grade ?? null,
      school_name: ai?.school_name ?? null,
      special_instructions: ai?.special_instructions ?? null,
      urgency: ai?.urgency ?? fallback.urgency ?? "normal",
      auto_add_to_calendar: ai?.auto_add_to_calendar ?? false,
      calendar_title: ai?.calendar_title ?? null,
      ai_processed: ai != null || alreadyDone,
      vendor: ai?.vendor ?? null,
      amount: ai?.amount ?? null,
      recurrence: ai?.recurrence ?? null,
    }
  })

  // Skip saving already-processed emails that had no changes (avoid unnecessary DB writes)
  const toSave = allEvents.filter((e) => !alreadyProcessedIds.has(e.gmail_message_id) || aiMap.has(e.gmail_message_id))

  allEvents.sort((a, b) => {
    if (!a.event_date && !b.event_date) return 0
    if (!a.event_date) return 1
    if (!b.event_date) return -1
    return new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  })

  return {
    events: toSave,
    organizations: Array.from(orgMap.values()).filter((o) => o.type !== "other"),
    facts: [],
    rawEmails: needsAI.map((e) => ({ id: e.id, subject: e.subject, from: e.from, snippet: e.snippet })),
  }
}
