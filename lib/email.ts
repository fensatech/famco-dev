const RESEND_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? "Famco <noreply@famco.app>"

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY || !to) return
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })
  } catch {
    // Email is non-critical — never throw
  }
}

export function swapCreatedHtml(opts: {
  requesterName: string
  date: string
  note: string | null
}): string {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
    <h2 style="color:#4f46e5;margin-bottom:8px">Custody swap request</h2>
    <p style="color:#374151;font-size:15px">
      <strong>${opts.requesterName}</strong> has requested a schedule swap for
      <strong>${opts.date}</strong>.
    </p>
    ${opts.note ? `<blockquote style="border-left:3px solid #6366f1;padding-left:12px;color:#6b7280;font-size:14px;margin:16px 0">${opts.note}</blockquote>` : ""}
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Log in to Famco to review and respond to this request.</p>
  </div>`
}

export function swapResolvedHtml(opts: {
  date: string
  status: "approved" | "declined"
  decisionNote: string | null
}): string {
  const color = opts.status === "approved" ? "#10b981" : "#ef4444"
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
    <h2 style="color:${color};margin-bottom:8px">Swap request ${opts.status}</h2>
    <p style="color:#374151;font-size:15px">
      Your swap request for <strong>${opts.date}</strong> was
      <strong style="color:${color}">${opts.status}</strong>.
    </p>
    ${opts.decisionNote ? `<blockquote style="border-left:3px solid ${color};padding-left:12px;color:#6b7280;font-size:14px;margin:16px 0">${opts.decisionNote}</blockquote>` : ""}
    <p style="color:#6b7280;font-size:13px;margin-top:24px">Log in to Famco to view your updated schedule.</p>
  </div>`
}
