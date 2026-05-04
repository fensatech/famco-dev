import type { ScannedEvent } from "@/types"
import { matchRelatedMember, type HouseholdScanContext } from "./household-scan"

interface GraphMessage {
  id: string
  subject: string
  receivedDateTime: string
  bodyPreview: string
  from: { emailAddress: { name: string; address: string } }
  hasAttachments: boolean
}

type OrgType = "school" | "medical_clinic" | "dental" | "sports" | "pharmacy" | "other"

const PROMO_PATTERN = /unsubscribe|% off|\bsale\b|discount|deal|offer|promo|flash sale|limited time|free shipping/i

function detectOrgType(name: string, domain: string, subject: string): OrgType {
  const haystack = `${name} ${domain} ${subject}`.toLowerCase()
  if (/dental|dentist|orthodont/.test(haystack)) return "dental"
  if (/pharmacy|chemist/.test(haystack)) return "pharmacy"
  if (/school|academy|nursery|preschool|daycare|kindergarten|primary|secondary|college|university|pta/.test(haystack)) return "school"
  if (/clinic|medical|hospital|gp|surgery|health|doctor|physio|optician|optometrist|nhs|vet|veterinary/.test(haystack)) return "medical_clinic"
  if (/sport|football|soccer|rugby|basketball|swimming|gym|yoga|dance|martial|karate|gymnastics/.test(haystack)) return "sports"
  return "other"
}

function detectEventType(
  subject: string,
  preview: string,
  hasAttachments: boolean,
): ScannedEvent["event_type"] {
  const haystack = `${subject} ${preview}`.toLowerCase()
  if (hasAttachments || /calendar invite|you.re invited|invitation to|event invitation/.test(haystack)) {
    return "calendar_invite"
  }
  if (/subscription|renewal|auto renew|membership|free trial|charged/.test(haystack)) return "subscription"
  if (/invoice|receipt|order confirmation|payment confirmation|transaction confirmed/.test(haystack)) return "invoice"
  if (/bill|statement available|insurance|internet|utility|hydro|phone bill/.test(haystack)) return "bill"
  if (/field.?trip/.test(haystack)) return "field_trip"
  if (/school closed|no school|pa day|snow day/.test(haystack)) return "no_school"
  if (/picture day|spirit day|pajama day|orange shirt|costume day|hot lunch/.test(haystack)) return "special_day"
  if (/recital|tournament|competition|showcase|performance|concert/.test(haystack)) return "recital"
  if (/practice|lesson|class|training|session|registration|tryout|game|meet|soccer|dance|swim|gymnastics|hockey|basketball|piano/.test(haystack)) return "activity"
  if (/school|academy|nursery|pta|parent teacher|term|daycare/.test(haystack)) return "school_event"
  if (/dental|dentist|doctor|clinic|hospital|medical|physio|optician|prescription|vet|veterinary/.test(haystack)) return "medical"
  return "appointment"
}

async function fetchMessages(
  accessToken: string,
  filter: string,
  top = 40,
): Promise<GraphMessage[]> {
  const params = new URLSearchParams({
    $filter: filter,
    $select: "id,subject,receivedDateTime,bodyPreview,from,hasAttachments",
    $top: String(top),
    $orderby: "receivedDateTime desc",
  })
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Graph API error: ${response.status} ${errorText}`)
  }
  const data = await response.json()
  return data.value ?? []
}

const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

const CALENDAR_FILTER =
  `hasAttachments eq true and receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'calendar invite') or contains(subject,'invitation') or ` +
  `contains(subject,'invited') or contains(subject,'.ics'))`

const APPOINTMENT_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'appointment') or contains(subject,'booking confirmation') or ` +
  `contains(subject,'your booking') or contains(subject,'appointment reminder') or ` +
  `contains(subject,'your visit') or contains(subject,'session confirmed') or ` +
  `contains(subject,'reservation confirmed'))`

const SCHOOL_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(subject,'school') or contains(subject,'parent teacher') or ` +
  `contains(subject,'term dates') or contains(subject,'school trip') or ` +
  `contains(subject,'school newsletter') or contains(subject,'school event') or ` +
  `contains(subject,'half term') or contains(subject,'school closure') or ` +
  `contains(from/emailAddress/address,'school') or contains(from/emailAddress/address,'academy') or ` +
  `contains(from/emailAddress/address,'daycare'))`

const MEDICAL_FILTER =
  `receivedDateTime ge ${SIX_MONTHS_AGO} and ` +
  `(contains(from/emailAddress/address,'clinic') or contains(from/emailAddress/address,'medical') or ` +
  `contains(from/emailAddress/address,'dental') or contains(from/emailAddress/address,'hospital') or ` +
  `contains(from/emailAddress/address,'health') or contains(from/emailAddress/address,'vet') or ` +
  `contains(subject,'test results') or contains(subject,'prescription') or ` +
  `contains(subject,'health check') or contains(subject,'vaccination') or contains(subject,'referral'))`

export interface OutlookScanResult {
  events: ScannedEvent[]
  organizations: { name: string; type: string; domain: string }[]
  facts: never[]
  rawEmails: { id: string; subject: string; from: string; snippet: string }[]
}

export async function scanOutlookEmails(
  accessToken: string,
  context: HouseholdScanContext,
): Promise<OutlookScanResult> {
  const seenIds = new Set<string>()
  const allEvents: ScannedEvent[] = []
  const orgMap = new Map<string, { name: string; type: OrgType; domain: string }>()

  async function processQuery(filter: string) {
    let messages: GraphMessage[]
    try {
      messages = await fetchMessages(accessToken, filter)
    } catch (error) {
      console.error("[outlook scan]", error instanceof Error ? error.message : error)
      return
    }

    for (const message of messages) {
      if (seenIds.has(message.id)) continue
      seenIds.add(message.id)

      const subject = message.subject ?? "(no subject)"
      const preview = message.bodyPreview ?? ""
      if (PROMO_PATTERN.test(subject)) continue

      const senderName = message.from?.emailAddress?.name ?? ""
      const senderAddress = message.from?.emailAddress?.address ?? ""
      const domain = senderAddress.includes("@") ? senderAddress.split("@")[1].toLowerCase() : ""
      const orgType = detectOrgType(senderName, domain, subject)
      const eventType = detectEventType(subject, preview, message.hasAttachments)
      const relatedMatch = matchRelatedMember(`${senderName} ${senderAddress} ${subject} ${preview}`, context)

      if (domain && !orgMap.has(domain)) {
        orgMap.set(domain, { name: senderName, type: orgType, domain })
      }

      const familyFallback =
        eventType === "subscription" || eventType === "invoice" || eventType === "bill"
          ? { related_member_name: "Family", related_member_type: "family" as const }
          : { related_member_name: null, related_member_type: null }

      allEvents.push({
        gmail_message_id: message.id,
        title: subject,
        event_date: message.receivedDateTime ?? null,
        start_time: null,
        end_time: null,
        event_type: eventType,
        organization_name: senderName || null,
        organization_type: orgType === "other" ? null : orgType,
        source_from: senderAddress,
        snippet: preview.slice(0, 300),
        related_member_name: relatedMatch.related_member_name ?? familyFallback.related_member_name,
        related_member_type: relatedMatch.related_member_type ?? familyFallback.related_member_type,
        kid_name: relatedMatch.kid_name,
        grade: null,
        school_name: relatedMatch.school_name,
        special_instructions: null,
        urgency: "normal",
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

  allEvents.sort((left, right) => {
    if (!left.event_date && !right.event_date) return 0
    if (!left.event_date) return 1
    if (!right.event_date) return -1
    return new Date(right.event_date).getTime() - new Date(left.event_date).getTime()
  })

  return {
    events: allEvents,
    organizations: Array.from(orgMap.values()).filter((org) => org.type !== "other"),
    facts: [],
    rawEmails: [],
  }
}
