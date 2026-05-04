"use client"

import { useEffect, useRef, useState } from "react"
import { inputSt } from "../styles"

interface SchoolSuggestion {
  id: string
  name: string
  street: string
  city: string
  province: string
  postal: string
  country: string
}

interface Props {
  schoolName: string
  schoolAddress: string
  onSchoolNameChange: (value: string) => void
  onSchoolAddressChange: (value: string) => void
  countryHint?: string
  placeholder?: string
}

function formatAddress(result: SchoolSuggestion) {
  return [result.street, result.city, result.province, result.postal].filter(Boolean).join(", ")
}

export function SchoolSearch({
  schoolName,
  schoolAddress,
  onSchoolNameChange,
  onSchoolAddressChange,
  countryHint,
  placeholder,
}: Props) {
  const [results, setResults] = useState<SchoolSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualAction, setShowManualAction] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  function selectSuggestion(suggestion: SchoolSuggestion) {
    onSchoolNameChange(suggestion.name || schoolName)
    onSchoolAddressChange(formatAddress(suggestion))
    setOpen(false)
    setError(null)
    setShowManualAction(false)
  }

  function applyManualValue() {
    const manual = schoolName.trim()
    if (!manual) return
    onSchoolNameChange(manual)
    setOpen(false)
  }

  function handleInput(nextValue: string) {
    onSchoolNameChange(nextValue)
    setError(null)
    setShowManualAction(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (nextValue.trim().length < 3) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      const currentRequestId = requestIdRef.current + 1
      requestIdRef.current = currentRequestId
      setLoading(true)

      try {
        const params = new URLSearchParams({ q: nextValue, mode: "school" })
        if (countryHint?.trim()) {
          params.set("country", countryHint)
        }
        const response = await fetch(`/api/address/search?${params.toString()}`, { cache: "no-store" })
        if (!response.ok) throw new Error("search failed")
        const data = await response.json() as { results?: SchoolSuggestion[] }
        if (requestIdRef.current !== currentRequestId) return
        const nextResults = Array.isArray(data.results) ? data.results : []
        setResults(nextResults)
        setOpen(nextResults.length > 0)
        setShowManualAction(nextResults.length === 0)
        if (nextResults.length === 0) {
          setError("No close school matches yet. Try the school name plus city.")
        }
      } catch {
        if (requestIdRef.current !== currentRequestId) return
        setResults([])
        setOpen(false)
        setShowManualAction(true)
        setError("School lookup is unavailable right now. You can still type it manually.")
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false)
        }
      }
    }, 260)
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          value={schoolName}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder ?? "Search school name..."}
          style={{ ...inputSt, paddingRight: "5.5rem" }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          autoComplete="off"
        />
        <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: loading ? "#f472b6" : "var(--muted)" }}>
          {loading ? "searching..." : "school"}
        </span>
      </div>

      {schoolAddress && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>
          {schoolAddress}
        </div>
      )}

      {error && !open && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", color: "var(--muted)" }}>{error}</div>
      )}

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, background: "rgba(255,255,255,0.99)", border: "1px solid rgba(244,114,182,0.35)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
          {results.map((result) => (
            <button
              key={result.id}
              onMouseDown={() => selectSuggestion(result)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", color: "var(--text)", fontSize: "0.78rem", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter',sans-serif", lineHeight: 1.4 }}
            >
              <div style={{ fontWeight: 600 }}>{result.name}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                {[result.street, result.city, result.province, result.postal].filter(Boolean).join(", ")}
              </div>
            </button>
          ))}
          {showManualAction && schoolName.trim() && (
            <button
              onMouseDown={applyManualValue}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.65rem 0.875rem", background: "rgba(244,114,182,0.08)", border: "none", color: "#f472b6", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}
            >
              Use &quot;{schoolName.trim()}&quot; as entered
            </button>
          )}
        </div>
      )}
    </div>
  )
}
