export function isAdminEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return configured.includes(normalized)
}
