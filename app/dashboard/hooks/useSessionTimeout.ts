"use client"
import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"

const TIMEOUT_MS = 30 * 60 * 1000
const WARN_MS = 25 * 60 * 1000

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>

    function reset() {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      setShowWarning(false)
      warnTimer = setTimeout(() => setShowWarning(true), WARN_MS)
      logoutTimer = setTimeout(() => signOut({ callbackUrl: "/" }), TIMEOUT_MS)
    }

    const evts = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      evts.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  return { showWarning, dismiss: () => setShowWarning(false) }
}
