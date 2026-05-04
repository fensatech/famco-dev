"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type { GCalEvent } from "../types"

export function useGoogleCalendar(provider: string) {
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalError, setGcalError] = useState("")
  const loadedRef = useRef(false)

  const fetchGcal = useCallback(async () => {
    if (provider !== "google" || loadedRef.current) return
    setGcalLoading(true)
    try {
      const r = await fetch("/api/gcal")
      const d = await r.json()
      if (r.status === 401 || d.error === "token_expired") {
        setGcalError("session_expired")
      } else if (r.status === 402 || d.error === "billing_required") {
        setGcalError("billing_required")
      } else if (d.error === "gcal_error") {
        setGcalError("gcal_error")
      } else if (Array.isArray(d.events)) {
        setGcalEvents(d.events)
        loadedRef.current = true
      } else {
        setGcalError("session_expired")
      }
    } catch {
      setGcalError("network_error")
    } finally {
      setGcalLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchGcal()
  }, [fetchGcal])

  function retry() {
    setGcalError("")
    loadedRef.current = false
    fetchGcal()
  }

  function removeEvent(id: string | null) {
    setGcalEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return { gcalEvents, setGcalEvents, gcalLoading, gcalError, retry, removeEvent }
}
