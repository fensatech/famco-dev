"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ScannedEventRow } from "../types"
import type { FamilyFact } from "@/types"

const AUTO_SYNC_INTERVAL_MS = 8 * 60 * 60 * 1000
const MANUAL_SCAN_COOLDOWN_MS = 4 * 60 * 60 * 1000
const INITIAL_SYNC_KEY = "famco_initial_sync_done"

export interface InsightsRefreshResult {
  error?: "token_expired" | "billing_required" | "scan_failed" | "network_error" | "setup_required" | "scan_cooldown"
  retryAt?: string
  setupSummary?: string
}

interface InsightsRefreshOptions {
  provider: string
  canAutoSync: boolean
  setupSummary: string
  initialInsightsCount: number
  initialLastScanAt: string | null
  initialLastManualScanAt: string | null
  onScannedEventsUpdate: (events: ScannedEventRow[]) => void
  onFactsUpdate: (facts: FamilyFact[]) => void
}

function supportsInboxSync(provider: string) {
  return provider === "google" || provider === "microsoft-entra-id"
}

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function cooldownUntil(lastManualScanAt: Date | null): Date | null {
  if (!lastManualScanAt) return null
  const next = new Date(lastManualScanAt.getTime() + MANUAL_SCAN_COOLDOWN_MS)
  return next.getTime() > Date.now() ? next : null
}

function nextAutoSyncAt(lastSyncAt: Date | null): Date | null {
  if (!lastSyncAt) return null
  return new Date(lastSyncAt.getTime() + AUTO_SYNC_INTERVAL_MS)
}

export function useInsightsRefresh({
  provider,
  canAutoSync,
  setupSummary,
  initialInsightsCount,
  initialLastScanAt,
  initialLastManualScanAt,
  onScannedEventsUpdate,
  onFactsUpdate,
}: InsightsRefreshOptions) {
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(() => parseDate(initialLastScanAt))
  const [lastManualScanAt, setLastManualScanAt] = useState<Date | null>(() => parseDate(initialLastManualScanAt))
  const [nowTick, setNowTick] = useState(() => Date.now())
  const syncInFlightRef = useRef(false)

  const runInsightsSync = useCallback(
    async (trigger: "auto" | "manual"): Promise<InsightsRefreshResult> => {
      if (syncInFlightRef.current) return {}
      syncInFlightRef.current = true

      try {
        const res = await fetch("/api/emails/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trigger }),
        })

        if (res.status === 401) return { error: "token_expired" }
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}))
          if (body.error === "billing_required") return { error: "billing_required" }
        }
        if (res.status === 409) {
          const body = await res.json().catch(() => ({}))
          return { error: "setup_required", setupSummary: body.setup_summary ?? setupSummary }
        }
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}))
          return { error: "scan_cooldown", retryAt: body.retry_at }
        }
        if (!res.ok) return { error: "scan_failed" }

        const body = await res.json().catch(() => ({}))
        const [insightsRes, factsRes] = await Promise.all([
          fetch("/api/insights"),
          fetch("/api/facts"),
        ])
        if (insightsRes.ok) {
          const { events } = await insightsRes.json()
          onScannedEventsUpdate(events)
        }
        if (factsRes.ok) {
          const { facts: newFacts } = await factsRes.json()
          onFactsUpdate(newFacts)
        }

        const syncTimestamp = parseDate(body.scanned_at ?? null)
        const manualTimestamp =
          trigger === "manual"
            ? parseDate(body.last_manual_scan_at ?? null) ?? new Date()
            : parseDate(body.last_manual_scan_at ?? null)

        if (syncTimestamp) {
          setLastSyncAt(syncTimestamp)
        }
        if (manualTimestamp) {
          setLastManualScanAt(manualTimestamp)
        }

        return {}
      } catch {
        return { error: "network_error" }
      } finally {
        syncInFlightRef.current = false
      }
    },
    [onFactsUpdate, onScannedEventsUpdate, setupSummary],
  )

  useEffect(() => {
    const key = INITIAL_SYNC_KEY
    if (!canAutoSync) {
      sessionStorage.removeItem(key)
      return
    }
    if (!supportsInboxSync(provider) || lastSyncAt || initialInsightsCount > 0) return
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "pending")
    void runInsightsSync("auto").then((result) => {
      if (result.error) {
        sessionStorage.setItem(key, "failed")
        return
      }
      sessionStorage.setItem(key, "1")
    })
  }, [canAutoSync, initialInsightsCount, lastSyncAt, provider, runInsightsSync])

  useEffect(() => {
    if (!canAutoSync || !supportsInboxSync(provider)) return

    const maybeRunScheduledSync = () => {
      if (document.visibilityState !== "visible") return
      if (syncInFlightRef.current) return
      if (!lastSyncAt) return
      if (Date.now() - lastSyncAt.getTime() < AUTO_SYNC_INTERVAL_MS) return
      void runInsightsSync("auto")
    }

    maybeRunScheduledSync()
    const interval = window.setInterval(maybeRunScheduledSync, 5 * 60 * 1000)
    window.addEventListener("focus", maybeRunScheduledSync)
    document.addEventListener("visibilitychange", maybeRunScheduledSync)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", maybeRunScheduledSync)
      document.removeEventListener("visibilitychange", maybeRunScheduledSync)
    }
  }, [canAutoSync, lastSyncAt, provider, runInsightsSync])

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  const manualScanCooldownUntil = useMemo(() => {
    void nowTick
    return cooldownUntil(lastManualScanAt)
  }, [lastManualScanAt, nowTick])
  const nextAutoSync = useMemo(() => nextAutoSyncAt(lastSyncAt), [lastSyncAt])

  async function refreshInsights(): Promise<InsightsRefreshResult> {
    if (!canAutoSync) {
      return { error: "setup_required", setupSummary }
    }
    const retryAt = cooldownUntil(lastManualScanAt)
    if (retryAt) {
      return { error: "scan_cooldown", retryAt: retryAt.toISOString() }
    }
    sessionStorage.removeItem(INITIAL_SYNC_KEY)
    return runInsightsSync("manual")
  }

  return {
    refreshInsights,
    lastSyncAt: lastSyncAt ? lastSyncAt.toISOString() : null,
    manualScanCooldownUntil: manualScanCooldownUntil ? manualScanCooldownUntil.toISOString() : null,
    nextAutoSyncAt: nextAutoSync ? nextAutoSync.toISOString() : null,
  }
}
