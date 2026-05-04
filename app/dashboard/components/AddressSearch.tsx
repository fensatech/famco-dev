"use client"

import { useEffect, useRef, useState } from "react"
import { inputSt } from "../styles"

interface AddressParts {
  street: string
  city: string
  province: string
  postal: string
  country: string
}

interface AddressSuggestion extends AddressParts {
  id: string
  display: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect?: (parts: AddressParts) => void
  onSelectSimple?: (full: string) => void
  placeholder?: string
  simpleMode?: boolean
  countryHint?: string
}

export function AddressSearch({
  value,
  onChange,
  onSelect,
  onSelectSimple,
  placeholder,
  simpleMode,
  countryHint,
}: Props) {
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualAction, setShowManualAction] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  function selectSuggestion(suggestion: AddressSuggestion) {
    if (simpleMode) {
      const full = [suggestion.street, suggestion.city, suggestion.province, suggestion.postal].filter(Boolean).join(", ")
      onChange(full)
      onSelectSimple?.(full)
    } else {
      onSelect?.({
        street: suggestion.street,
        city: suggestion.city,
        province: suggestion.province,
        postal: suggestion.postal,
        country: suggestion.country,
      })
      onChange(suggestion.street)
    }
    setOpen(false)
    setError(null)
    setShowManualAction(false)
  }

  function applyManualValue() {
    const manual = value.trim()
    if (!manual) return
    onSelectSimple?.(manual)
    setOpen(false)
  }

  function handleInput(nextValue: string) {
    onChange(nextValue)
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
        const params = new URLSearchParams({ q: nextValue })
        if (countryHint?.trim()) {
          params.set("country", countryHint)
        }
        const response = await fetch(`/api/address/search?${params.toString()}`, { cache: "no-store" })
        if (!response.ok) throw new Error("search failed")
        const data = await response.json() as { results?: AddressSuggestion[] }
        if (requestIdRef.current !== currentRequestId) return
        const nextResults = Array.isArray(data.results) ? data.results : []
        setResults(nextResults)
        setOpen(nextResults.length > 0)
        setShowManualAction(nextResults.length === 0)
        if (nextResults.length === 0) {
          setError("No close matches yet. Try street number + street name.")
        }
      } catch {
        if (requestIdRef.current !== currentRequestId) return
        setResults([])
        setOpen(false)
        setShowManualAction(true)
        setError("Lookup is unavailable right now. You can still type the address manually.")
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
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder ?? "Start typing address…"}
          style={{ ...inputSt, paddingRight: "5.5rem" }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          autoComplete="off"
        />
        <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", color: loading ? "#818cf8" : "var(--muted)" }}>
          {loading ? "searching…" : "auto-fill"}
        </span>
      </div>

      {error && !open && (
        <div style={{ marginTop: "0.35rem", fontSize: "0.68rem", color: "var(--muted)" }}>{error}</div>
      )}

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200, background: "rgba(255,255,255,0.99)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: "10px", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
          {results.map((result) => (
            <button
              key={result.id}
              onMouseDown={() => selectSuggestion(result)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", color: "var(--text)", fontSize: "0.78rem", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter',sans-serif", lineHeight: 1.4 }}
            >
              <div style={{ fontWeight: 600 }}>{result.street || result.display}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.15rem" }}>
                {[result.city, result.province, result.postal, result.country].filter(Boolean).join(", ")}
              </div>
            </button>
          ))}
          {showManualAction && value.trim() && (
            <button
              onMouseDown={applyManualValue}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.65rem 0.875rem", background: "rgba(99,102,241,0.06)", border: "none", color: "#6366F1", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}
            >
              Use &quot;{value.trim()}&quot; as entered
            </button>
          )}
        </div>
      )}
    </div>
  )
}
