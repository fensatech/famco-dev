"use client"
import { signOut } from "next-auth/react"
import { NAV, type Tab } from "../types"
import { NavIcon } from "./NavIcon"

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  scannedCount: number
  pendingTaskCount: number
  appVersion?: string
  showAdminLink?: boolean
}

export function SidebarNav({ tab, onTab, scannedCount, pendingTaskCount, appVersion, showAdminLink = false }: Props) {
  return (
    <aside
      style={{
        width: "260px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        background: "#FFFFFF",
        boxShadow: "1px 0 0 rgba(60,60,67,0.1)",
      }}
    >
      <button
        onClick={() => onTab("home")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          marginBottom: "2rem",
          padding: "0 0.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "1.15rem",
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}
        >
          Famco
        </span>
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
        {NAV.map(({ id, label, color, bg }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.7rem 0.875rem",
                borderRadius: "12px",
                border: "none",
                background: active ? bg : "transparent",
                color: active ? color : "var(--muted)",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
                textAlign: "left",
                width: "100%",
                boxShadow: active ? `0 1px 4px ${color}25` : "none",
              }}
            >
              <NavIcon id={id} size={17} color={active ? color : "var(--muted)"} />
              <span>{label}</span>
              {id === "insights" && scannedCount > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#fbbf24",
                    color: "#000",
                    borderRadius: "10px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                  }}
                >
                  {scannedCount > 99 ? "99+" : scannedCount}
                </span>
              )}
              {id === "tasks" && pendingTaskCount > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#f472b6",
                    color: "#fff",
                    borderRadius: "10px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.1rem 0.45rem",
                  }}
                >
                  {pendingTaskCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {appVersion && (
        <div
          style={{
            marginTop: "1rem",
            marginBottom: "0.5rem",
            padding: "0 0.875rem",
            color: "var(--muted)",
            fontSize: "0.68rem",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          Version {appVersion}
        </div>
      )}

      {showAdminLink && (
        <a
          href="/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            padding: "0.65rem 0.875rem",
            borderRadius: "10px",
            border: "1px solid rgba(99,102,241,0.14)",
            background: "rgba(99,102,241,0.06)",
            color: "#6366F1",
            fontSize: "0.8rem",
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: "0.5rem",
          }}
        >
          <span>🛡️</span> Admin Portal
        </a>
      )}

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          padding: "0.65rem 0.875rem",
          borderRadius: "10px",
          border: "1px solid rgba(60,60,67,0.12)",
          background: "transparent",
          color: "var(--muted)",
          fontSize: "0.82rem",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
          width: "100%",
          transition: "background 0.15s",
        }}
      >
        <span>↪</span> Sign out
      </button>
    </aside>
  )
}
