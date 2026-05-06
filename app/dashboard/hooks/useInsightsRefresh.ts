"use client"
import { useCallback, useEffect } from "react"
import type { ScannedEventRow } from "../types"
import type { FamilyFact } from "@/types"

interface InsightsRefreshOptions {
  provider: string
  initialInsightsCount: number
  onScannedEventsUpdate: (events: ScannedEventRow[]) => void
  onFactsUpdate: (facts: FamilyFact[]) => void
}

function supportsInboxSync(provider: string) {
  return provider === "google" || provider === "microsoft-entra-id"
}

export function useInsightsRefresh({ provider, initialInsightsCount, onScannedEventsUpdate, onFactsUpdate }: InsightsRefreshOptions) {
  const runInsightsSync = useCallback(async (): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/emails/scan", { method: "POST" })
      if (res.status === 401) return { error: "token_expired" }
      if (res.status === 402) {
        const body = await res.json().catch(() => ({}))
        if (body.error === "billing_required") return { error: "billing_required" }
      }
      if (!res.ok) return { error: "scan_failed" }
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
      return {}
    } catch {
      return { error: "network_error" }
    }
  }, [onFactsUpdate, onScannedEventsUpdate])

  useEffect(() => {
    if (!supportsInboxSync(provider) || initialInsightsCount > 0) return
    const key = "famco_scan_done"
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "pending")
    void runInsightsSync().then((result) => {
      if (result.error) {
        sessionStorage.removeItem(key)
        return
      }
      sessionStorage.setItem(key, "1")
    })
  }, [initialInsightsCount, provider, runInsightsSync])

  async function refreshInsights(): Promise<{ error?: string }> {
    sessionStorage.removeItem("famco_scan_done")
    return runInsightsSync()
  }

  return { refreshInsights }
}
