"use client"
import { useEffect } from "react"
import type { ScannedEventRow } from "../types"
import type { FamilyFact } from "@/types"

interface InsightsRefreshOptions {
  provider: string
  onScannedEventsUpdate: (events: ScannedEventRow[]) => void
  onFactsUpdate: (facts: FamilyFact[]) => void
}

export function useInsightsRefresh({ provider, onScannedEventsUpdate, onFactsUpdate }: InsightsRefreshOptions) {
  useEffect(() => {
    if (provider !== "google") return
    const key = "famco_scan_done"
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    fetch("/api/emails/scan", { method: "POST" }).catch(() => {})
  }, [provider])

  async function refreshInsights(): Promise<{ error?: string }> {
    sessionStorage.removeItem("famco_scan_done")
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
  }

  return { refreshInsights }
}
