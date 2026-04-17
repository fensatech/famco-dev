import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FAMCO — Family Command Center",
  description:
    "The all-in-one command center for every family. Manage schedules, school appointments, and daily life — together.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </body>
    </html>
  )
}
