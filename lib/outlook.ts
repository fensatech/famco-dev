import type { ScannedEvent } from "@/types"

interface GraphMessage {
  id: string
  subject: string
  receivedDateTime: string
  bodyPreview: string
  from: { emailAddress: { name: string; address: string } }
  hasAttachments: boolean
}

type OrgType = "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | "other"

const PROMO_PATTERN =
  /unsubscribe|% off|\bsale\b|discount|deal|offer|promo|flash sale|limited time|free shipping/i

function detectOrgType(name: string, domain: string, subject: string): OrgType {
  const h = `${name} ${domain} ${subject}`.toLowerCase()
  if (/dental|dentist|orthodont/.test(h)) return "dental"
  if (/pharmacy|chemist/.test(h)) return "pharmacy"
  if (/school|academy|nursery|preschool|daycare|kindergarten|primary|secondary|college|university|pta/.test(h))
    return "school"
  if (/clinic|medical|hospital|gp|surgery|health|doctor|physio|optician|optometrist|nhs/.test(h))
    return "medical_clinic"
  if (/sport|football|soccer|rugby|basketball|swimming|gym|yoga|dance|martial|karate|gymnastics/.test(h))
    return "sports"
  return "other"
}

function detectEventType(
  subject: string,
  preview: string,
  hasAttachments: boolean
): ScannedEvent["event_type"] {
  const h = `${subject} ${preview}`.toLowerCase()
  // Calendar invites often have attachments (.ics) or contain invite language
  if (hasAttachments || /calendar invite|you.re invited|invitation to|event invitation/.test(h))
    return "calendar_invite"
  if (/school|academy|nursery|pta|parent.teacher|term/.test(h)) return "school_event"
  if (/dental|dentist|doctor|clinic|hospital|medical|physio|optician|prescription/.test(h))
    return "medical"
  return "appointment"
}

async function fetchMessages(
  accessToken: string,
  filter: string,
  top = 40
): Promise<GraphMessage[]> {
  const params = new URLSearchParams({
    $filter: filter,
    $select: "id,subject,receivedDateTime,bodyPreview,from,hasAttachments",
    $top: String(top),
    $orderby: "receivedDateTime desc",
  })
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph API error: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.value ?? []
}

// ── Microsoft Graph OData filters ────────────────────────────────────────────

const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

// Calendar invites — have attachments and contain invite-like subject words
const CALENDAR_FILTER =
  `hasAttachments eq true and receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'calendar invite') or contains(subject,'invitation') or ` +
  `contains(subject,'invited') or contains(subject,'.ics'))`

// Appointment/booking confirmations
const APPOINTMENT_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'appointment') or contains(subject,'booking confirmation') or ` +
  `contains(subject,'your booking') or contains(subject,'appointment reminder') or ` +
  `contains(subject,'your visit') or contains(subject,'session confirmed') or ` +
  `contains(subject,'reservation confirmed'))`

// School-related
const SCHOOL_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'school') or contains(subject,'parent teacher') or ` +
  `contains(subject,'term dates') or contains(subject,'school trip') or ` +
  `contains(subject,'school newsletter') or contains(subject,'school event') or ` +
  `contains(subject,'half term') or contains(subject,'school closure') or ` +
  `contains(from/emailAddress/address,'school') or contains(from/emailAddress/address,'academy'))`

// Medical/health
const MEDICAL_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(from/emailAddress/address,'clinic') or contains(from/emailAddress/address,'medical') or ` +
  `contains(from/emailAddress/address,'dental') or contains(from/emailAddress/address,'hospital') or ` +
  `contains(from/emailAddress/address,'health') or contains(subject,'test results') or ` +
  `contains(subject,'prescription') or contains(subject,'health check') or ` +
  `contains(subject,'vaccination') or contains(subject,'referral'))`

// ── Main export ───────────────────────────────────────────────────────────────

export interface OutlookScanResult {
  events: ScannedEvent[]
  organizations: { name: string; type: string; domain: string }[]
  facts: never[]
  rawEmails: { id: string; subject: string; from: string; snippet: string }[]
}

export async function scanOutlookEmails(accessToken: string): Promise<OutlookScanResult> {
  const seenIds = new Set<string>()
  const allEvents: ScannedEvent[] = []
  const orgMap = new Map<string, { name: string; type: OrgType; domain: string }>()

  async function processQuery(filter: string) {
    let messages: GraphMessage[]
    try {
      messages = await fetchMessages(accessToken, filter)
    } catch (err) {
      console.error("[outlook scan]", err instanceof Error ? err.message : err)
      return
    }

    for (const msg of messages) {
      if (seenIds.has(msg.id)) continue
      seenIds.add(msg.id)

      const subject = msg.subject ?? "(no subject)"
      const preview = msg.bodyPreview ?? ""
      if (PROMO_PATTERN.test(subject)) continue

      const senderName = msg.from?.emailAddress?.name ?? ""
      const senderAddr = msg.from?.emailAddress?.address ?? ""
      const domain = senderAddr.includes("@") ? senderAddr.split("@")[1].toLowerCase() : ""
      const orgType = detectOrgType(senderName, domain, subject)
      const eventType = detectEventType(subject, preview, msg.hasAttachments)

      if (domain && !orgMap.has(domain)) {
        orgMap.set(domain, { name: senderName, type: orgType, domain })
      }

      allEvents.push({
        gmail_message_id: msg.id,
        title: subject,
        event_date: msg.receivedDateTime ?? null,
        start_time: null,
        end_time: null,
        event_type: eventType,
        organization_name: senderName || null,
        organization_type: orgType === "other" ? null : orgType,
        source_from: senderAddr,
        snippet: preview.slice(0, 300),
        kid_name: null,
        grade: null,
        school_name: null,
        special_instructions: null,
        urgency: "normal" as const,
        auto_add_to_calendar: false,
        calendar_title: null,
        ai_processed: false,
        vendor: null,
        amount: null,
        recurrence: null,
      })
    }
  }

  await processQuery(CALENDAR_FILTER)
  await processQuery(APPOINTMENT_FILTER)
  await processQuery(SCHOOL_FILTER)
  await processQuery(MEDICAL_FILTER)

  allEvents.sort((a, b) => {
    if (!a.event_date && !b.event_date) return 0
    if (!a.event_date) return 1
    if (!b.event_date) return -1
    return new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  })

  return {
    events: allEvents,
    organizations: Array.from(orgMap.values()).filter((o) => o.type !== "other"),
    facts: [] as never[],
    rawEmails: [],
  }
}
