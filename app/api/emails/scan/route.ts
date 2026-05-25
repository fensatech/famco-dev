import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { billingEnforcementEnabled, getTrialStartedAt, getTrialWindow, isSyncAllowedForProfile } from "@/lib/billing"
import {
  createEvent,
  ensureRuntimeSchema,
  getExistingMessageIds,
  getFamilyFacts,
  getInboxSyncState,
  getInsightCorrectionHints,
  getKids,
  getPets,
  getPrimaryHouseholdProfile,
  getProfile,
  recordInboxSync,
  getScannedEvents,
  saveScannedEvents,
  saveScannedOrganizations,
  updateFactStatus,
  upsertFacts,
} from "@/lib/db"
import { aiExtractFacts, resolveConflicts, seedFactsFromEvents } from "@/lib/facts"
import { scanEmails } from "@/lib/gmail"
import type { HouseholdScanContext } from "@/lib/household-scan"
import { scanOutlookEmails } from "@/lib/outlook"
import type { Kid, Pet } from "@/types"
import { getHouseholdSetupStatus } from "@/app/dashboard/lib/setup"

const MANUAL_SCAN_COOLDOWN_MS = 4 * 60 * 60 * 1000
const FACT_EXTRACTION_BATCH_SIZE = 10
const MAX_FACT_EXTRACTION_EMAILS = 40

function isAuthError(message: string) {
  return (
    message.includes("invalid_grant") ||
    message.includes("Invalid Credentials") ||
    message.includes("invalid authentication") ||
    message.includes("Token has been expired") ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("unauthorized") ||
    message.includes("Unauthorized") ||
    message.includes("access_denied") ||
    message.includes("invalid_token")
  )
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
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

function buildHouseholdScanContext(
  profile: Awaited<ReturnType<typeof getProfile>>,
  kids: Kid[],
  pets: Pet[],
): HouseholdScanContext {
  const parentName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()
  const spouseName = `${profile?.spouse_first_name ?? ""} ${profile?.spouse_last_name ?? ""}`.trim()
  const partnerName = profile?.partner_name?.trim() ?? ""
  const adultNames = uniqueStrings([parentName, spouseName, partnerName])

  return {
    city: profile?.city ?? null,
    timezone: profile?.timezone ?? null,
    members: [
      ...adultNames.map((name) => ({
        name,
        type: "adult" as const,
        first_name: name.split(" ").find(Boolean) ?? null,
      })),
      ...kids.map((kid) => ({
        name: kid.name,
        type: "child" as const,
        first_name: kid.first_name ?? kid.name.split(" ").find(Boolean) ?? null,
        grade: kid.grade ?? null,
        school_name: kid.school_name ?? null,
        school_address: kid.school_address ?? null,
        daycare_name: kid.daycare_name ?? null,
        daycare_address: kid.daycare_address ?? null,
      })),
      ...pets.map((pet) => ({
        name: pet.name,
        type: "pet" as const,
        first_name: pet.name.split(" ").find(Boolean) ?? null,
        animal_type: pet.animal_type ?? null,
      })),
    ],
  }
}

function correctionKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null
}

function applyCorrectionHints<T extends {
  source_from: string
  organization_name: string | null
  related_member_name?: string | null
  related_member_type?: "adult" | "child" | "pet" | "family" | null
  event_type: string
  ai_processed?: boolean
}>(
  events: T[],
  hints: Awaited<ReturnType<typeof getInsightCorrectionHints>>,
): T[] {
  if (hints.length === 0) return events

  const bySource = new Map<string, (typeof hints)[number]>()
  const byOrganization = new Map<string, (typeof hints)[number]>()
  for (const hint of hints) {
    const sourceKey = correctionKey(hint.source_from)
    const orgKey = correctionKey(hint.organization_name)
    if (sourceKey && !bySource.has(sourceKey)) bySource.set(sourceKey, hint)
    if (orgKey && !byOrganization.has(orgKey)) byOrganization.set(orgKey, hint)
  }

  return events.map((event) => {
    const hint =
      bySource.get(correctionKey(event.source_from) ?? "") ??
      byOrganization.get(correctionKey(event.organization_name) ?? "")
    if (!hint) return event

    return {
      ...event,
      related_member_name: event.related_member_name ?? hint.corrected_member_name,
      related_member_type: event.related_member_type ?? hint.corrected_member_type,
      event_type: event.ai_processed ? event.event_type : hint.corrected_event_type ?? event.event_type,
    }
  })
}

async function extractFactsInBatches(
  emails: { id: string; subject: string; from: string; snippet: string }[],
  members: Parameters<typeof aiExtractFacts>[1],
) {
  const facts: Awaited<ReturnType<typeof aiExtractFacts>> = []
  const cappedEmails = emails.slice(0, MAX_FACT_EXTRACTION_EMAILS)

  for (let index = 0; index < cappedEmails.length; index += FACT_EXTRACTION_BATCH_SIZE) {
    const batch = cappedEmails.slice(index, index + FACT_EXTRACTION_BATCH_SIZE)
    facts.push(...await aiExtractFacts(batch, members))
  }

  return facts
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.accessToken || session.tokenExpired) {
    return NextResponse.json({ error: "token_expired" }, { status: 401 })
  }

  const provider = session.provider
  if (provider !== "google" && provider !== "microsoft-entra-id") {
    return NextResponse.json({ ok: true, skipped: true, reason: "provider_not_supported" })
  }

  try {
    await ensureRuntimeSchema()
    const warnings = new Set<string>()
    const body = await request.json().catch(() => ({}))
    const trigger = body?.trigger === "manual" ? "manual" : "auto"

    const billingProfile = await getPrimaryHouseholdProfile(session.profileId)
    if (billingEnforcementEnabled() && billingProfile && !isSyncAllowedForProfile(billingProfile)) {
      const trialWindow = getTrialWindow(getTrialStartedAt(billingProfile))
      return NextResponse.json(
        {
          error: "billing_required",
          billing_status: trialWindow.status,
          trial_ends_at: trialWindow.trialEndsAt,
          access_ends_at: trialWindow.graceEndsAt,
        },
        { status: 402 },
      )
    }

    const [kids, pets, syncState, existingIds, profile, correctionHints] = await Promise.all([
      getKids(session.profileId),
      getPets(session.profileId).catch(() => []),
      getInboxSyncState(session.profileId),
      getExistingMessageIds(session.profileId),
      getProfile(session.profileId),
      getInsightCorrectionHints(session.profileId).catch(() => []),
    ])

    const householdSetup = getHouseholdSetupStatus(
      {
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        city: profile?.city ?? "",
        timezone: profile?.timezone ?? "",
        familyType: profile?.family_type ?? null,
        createdAt: profile?.created_at ?? new Date().toISOString(),
        spouseFirstName: profile?.spouse_first_name ?? "",
        spouseLastName: profile?.spouse_last_name ?? "",
        spousePhone: profile?.spouse_phone ?? "",
        spouseEmail: profile?.spouse_email ?? "",
        addressStreet: profile?.address_street ?? "",
        addressProvince: profile?.address_province ?? "",
        addressPostal: profile?.address_postal ?? "",
        addressCountry: profile?.address_country ?? "",
        workType: profile?.work_type ?? "",
        workAddress: profile?.work_address ?? "",
        spouseWorkType: profile?.spouse_work_type ?? "",
        spouseWorkAddress: profile?.spouse_work_address ?? "",
      },
      kids.map((kid) => ({
        id: kid.id,
        name: kid.name,
        firstName: kid.first_name ?? null,
        lastName: kid.last_name ?? null,
        dob: kid.dob ? new Date(kid.dob).toISOString().split("T")[0] : null,
        schoolName: kid.school_name ?? null,
        schoolAddress: kid.school_address ?? null,
        grade: kid.grade ?? null,
        daycareName: kid.daycare_name ?? null,
        daycareAddress: kid.daycare_address ?? null,
      })),
      pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
        animalType: pet.animal_type,
        breed: pet.breed ?? null,
        dob: pet.dob ? new Date(pet.dob).toISOString().split("T")[0] : null,
      })),
    )

    if (!householdSetup.readyForInboxSync) {
      return NextResponse.json(
        {
          error: "setup_required",
          setup_summary: householdSetup.summary,
        },
        { status: 409 },
      )
    }

    if (
      trigger === "manual" &&
      syncState.lastManualScanAt &&
      Date.now() - syncState.lastManualScanAt.getTime() < MANUAL_SCAN_COOLDOWN_MS
    ) {
      const retryAt = new Date(syncState.lastManualScanAt.getTime() + MANUAL_SCAN_COOLDOWN_MS)
      return NextResponse.json(
        {
          error: "scan_cooldown",
          retry_at: retryAt.toISOString(),
        },
        { status: 429 },
      )
    }

    const householdContext = buildHouseholdScanContext(profile, kids, pets)
    const isFirstScan = syncState.lastSyncAt === null
    const parentName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Parent" : "Parent"
    const spouseName = profile ? `${profile.spouse_first_name ?? ""} ${profile.spouse_last_name ?? ""}`.trim() : ""

    const result =
      provider === "google"
        ? await scanEmails(session.accessToken, householdContext, syncState.lastSyncAt, existingIds)
        : await scanOutlookEmails(session.accessToken, householdContext, syncState.lastSyncAt, existingIds)
    result.events = applyCorrectionHints(result.events, correctionHints)

    if (result.ai_unavailable_reason === "credits") warnings.add("ai_credits_unavailable")
    if (result.ai_unavailable_reason === "auth") warnings.add("ai_temporarily_unavailable")

    await saveScannedEvents(session.profileId, result.events)

    try {
      await saveScannedOrganizations(
        session.profileId,
        result.organizations.map((organization) => ({
          name: organization.name,
          type: organization.type,
          email_domain: organization.domain,
        })),
      )
    } catch (err) {
      console.error("[scan/saveScannedOrganizations]", err instanceof Error ? err.message : err)
      warnings.add("organization_indexing_skipped")
    }

    const openAiKey = process.env.OPENAI_API_KEY?.trim()
    if (openAiKey && result.rawEmails.length > 0 && !result.ai_unavailable_reason) {
      try {
        const members = [
          { name: parentName, type: "parent" as const },
          ...(spouseName ? [{ name: spouseName, type: "parent" as const }] : []),
          ...kids.map((kid: Kid) => ({
            name: kid.name,
            type: "kid" as const,
            dob: kid.dob ?? null,
            school_name: kid.school_name ?? null,
            grade: kid.grade ?? null,
          })),
        ]
        const aiFacts = await extractFactsInBatches(result.rawEmails, members)
        if (aiFacts.length > 0) await upsertFacts(session.profileId, aiFacts)
        if (result.rawEmails.length > MAX_FACT_EXTRACTION_EMAILS) {
          warnings.add("fact_enrichment_capped")
        }
      } catch (err) {
        console.error("[scan/aiExtractFacts]", err instanceof Error ? err.message : err)
        warnings.add("fact_enrichment_skipped")
      }
    }

    let seededFacts: ReturnType<typeof seedFactsFromEvents> = []
    try {
      if (result.facts.length > 0) {
        await upsertFacts(session.profileId, result.facts)
      }

      const allEvents = await getScannedEvents(session.profileId)
      seededFacts = seedFactsFromEvents(allEvents, [
        { name: parentName, type: "parent" as const },
        ...(spouseName ? [{ name: spouseName, type: "parent" as const }] : []),
        ...kids.map((kid: Kid) => ({
          name: kid.name,
          type: "kid" as const,
          dob: kid.dob ?? null,
          school_name: kid.school_name ?? null,
          grade: kid.grade ?? null,
        })),
      ])
      if (seededFacts.length > 0) await upsertFacts(session.profileId, seededFacts)

      const allFacts = await getFamilyFacts(session.profileId)
      const conflicts = resolveConflicts(
        allFacts,
        kids.map((kid: Kid) => ({ name: kid.name, dob: kid.dob ?? null })),
      )
      for (const { id, status } of conflicts) {
        await updateFactStatus(session.profileId, id, status)
      }
    } catch (err) {
      console.error("[scan/facts]", err instanceof Error ? err.message : err)
      warnings.add("family_knowledge_skipped")
    }

    const autoAddEvents = result.events.filter(
      (event) => event.auto_add_to_calendar && event.event_date && event.calendar_title,
    )
    let auto_added = 0
    for (const event of autoAddEvents) {
      try {
        await createEvent(session.profileId, {
          title: event.calendar_title!,
          event_date: event.event_date!.split("T")[0],
          start_time: event.start_time ?? null,
          end_time: event.end_time ?? null,
          description: event.special_instructions ?? null,
          member_name:
            event.related_member_name && event.related_member_name !== "Family"
              ? event.related_member_name
              : null,
        })
        auto_added++
      } catch {
        // Ignore duplicate event errors so the rest of the scan can still succeed.
      }
    }

    const advanceSyncCursor = !result.ai_unavailable_reason
    if (!advanceSyncCursor) warnings.add("ai_enrichment_retry_pending")
    const syncTimestamps = await recordInboxSync(session.profileId, trigger, { advanceSyncCursor })

    return NextResponse.json({
      ok: true,
      provider,
      trigger,
      first_scan: isFirstScan,
      emails_fetched: result.events.length,
      ai_processed: result.events.filter((event) => event.ai_processed).length,
      skipped_already_done: existingIds.size,
      auto_added,
      facts_extracted: (result.facts?.length ?? 0) + seededFacts.length,
      scanned_at: syncTimestamps.lastSyncAt?.toISOString() ?? (advanceSyncCursor ? new Date().toISOString() : null),
      ai_enrichment_pending: !advanceSyncCursor,
      last_manual_scan_at: syncTimestamps.lastManualScanAt?.toISOString() ?? null,
      warnings: Array.from(warnings),
      by_type: result.events.reduce<Record<string, number>>((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] ?? 0) + 1
        return acc
      }, {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown"
    console.error("[emails/scan]", message)
    if (isAuthError(message)) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 })
    }
    return NextResponse.json({ error: "Scan failed" }, { status: 500 })
  }
}
