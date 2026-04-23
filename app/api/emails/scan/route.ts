import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { scanEmails } from "@/lib/gmail"
import { scanOutlookEmails } from "@/lib/outlook"
import {
  saveScannedEvents, saveScannedOrganizations,
  getKids, createEvent, getLastScanDate, getExistingMessageIds,
  upsertFacts, getFamilyFacts, updateFactStatus, getScannedEvents, getProfile,
} from "@/lib/db"
import { seedFactsFromEvents, resolveConflicts, aiExtractFacts } from "@/lib/facts"
import type { Kid } from "@/types"
import Anthropic from "@anthropic-ai/sdk"

export async function POST() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 })

  const provider = session.provider

  if (provider !== "google" && provider !== "microsoft-entra-id") {
    return NextResponse.json({ ok: true, skipped: true, reason: "provider_not_supported" })
  }

  try {
    const [kids, lastScanDate, existingIds, profile] = await Promise.all([
      getKids(session.profileId),
      getLastScanDate(session.profileId),
      getExistingMessageIds(session.profileId),
      getProfile(session.profileId),
    ])

    const kidInfos = kids.map((k: Kid) => ({ name: k.name, grade: k.grade ?? null, school_name: k.school_name ?? null }))
    const isFirstScan = lastScanDate === null

    const result =
      provider === "google"
        ? await scanEmails(session.accessToken, kidInfos, lastScanDate, existingIds)
        : await scanOutlookEmails(session.accessToken)

    await Promise.all([
      saveScannedEvents(session.profileId, result.events),
      saveScannedOrganizations(
        session.profileId,
        result.organizations.map((o) => ({ name: o.name, type: o.type, email_domain: o.domain }))
      ),
    ])

    // ── Build family knowledge graph ──────────────────────────────────────────
    // 1. Run aiExtractFacts on new emails (cap at 15 to avoid rate limits)
    //    This surfaces nuanced facts like teacher names, activity details
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey && result.rawEmails && result.rawEmails.length > 0) {
      try {
        const client = new Anthropic({ apiKey: anthropicKey })
        const parentName = profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : "Parent"
        const members = [
          { name: parentName, type: "parent" as const },
          ...kids.map((k: Kid) => ({ name: k.name, type: "kid" as const, dob: k.dob ?? null, school_name: k.school_name ?? null, grade: k.grade ?? null })),
        ]
        const emailsForAI = result.rawEmails.slice(0, 15)
        const aiFacts = await aiExtractFacts(client, emailsForAI, members)
        if (aiFacts.length > 0) await upsertFacts(session.profileId, aiFacts)
      } catch (err) {
        console.error("[scan/aiExtractFacts]", err instanceof Error ? err.message : err)
      }
    }

    // 1b. Save any structured facts from event scanning (currently always [])
    if (result.facts && result.facts.length > 0) {
      await upsertFacts(session.profileId, result.facts)
    }

    // 2. Seed facts from ALL scanned_events (idempotent — upsert deduplicates)
    //    On first scan this bootstraps the graph from event-level data instantly
    const allEvents = await getScannedEvents(session.profileId)
    const kidMembers = kids.map((k: Kid) => ({ name: k.name, type: "kid" as const, dob: k.dob ?? null, school_name: k.school_name ?? null, grade: k.grade ?? null }))
    const seededFacts = seedFactsFromEvents(allEvents, kidMembers)
    if (seededFacts.length > 0) await upsertFacts(session.profileId, seededFacts)

    // 3. Run conflict resolution on the full fact graph
    const allFacts = await getFamilyFacts(session.profileId)
    const conflicts = resolveConflicts(allFacts, kids.map((k: Kid) => ({ name: k.name, dob: k.dob ?? null })))
    for (const { id, status } of conflicts) {
      await updateFactStatus(session.profileId, id, status)
    }

    // Auto-add calendar events for AI-flagged items
    const autoAddEvents = result.events.filter(
      (e) => e.auto_add_to_calendar && e.event_date && e.calendar_title
    )
    let auto_added = 0
    for (const e of autoAddEvents) {
      try {
        await createEvent(session.profileId, {
          title: e.calendar_title!,
          event_date: e.event_date!.split("T")[0],
          start_time: e.start_time ?? null,
          end_time: e.end_time ?? null,
          description: e.special_instructions ?? null,
        })
        auto_added++
      } catch { /* ignore duplicate constraint errors */ }
    }

    return NextResponse.json({
      ok: true,
      provider,
      first_scan: isFirstScan,
      emails_fetched: result.events.length,
      ai_processed: result.events.filter((e) => e.ai_processed).length,
      skipped_already_done: existingIds.size,
      auto_added,
      facts_extracted: (result.facts?.length ?? 0) + seededFacts.length,
      by_type: result.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
        return acc
      }, {}),
    })
  } catch (err) {
    console.error("[emails/scan]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Scan failed" }, { status: 500 })
  }
}
