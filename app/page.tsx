import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { ONBOARDING_STEPS } from "@/types"

export default async function Home() {
  const session = await auth()
  if (session?.profileId) {
    const profile = await getProfile(session.profileId)
    if (profile?.onboarding_completed) redirect("/dashboard")
    const step = ONBOARDING_STEPS[profile?.onboarding_step ?? 0] ?? "profile"
    redirect(`/onboarding/${step}`)
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        className="glass fade-up"
        style={{ width: "100%", maxWidth: "420px", padding: "2.5rem" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              background: "linear-gradient(135deg,#6366f1,#c084fc)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              margin: "0 auto 1.25rem",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}
          >
            🏠
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.5rem",
            }}
          >
            Welcome to{" "}
            <span className="gradient-text">Famco</span>
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            Family Command Center — your all-in-one family organiser.
          </p>
        </div>

        {/* Sign-in buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Google */}
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "var(--text)",
                fontSize: "0.9rem",
                fontWeight: 500,
                fontFamily: "'Inter',sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Microsoft */}
          <form
            action={async () => {
              "use server"
              await signIn("microsoft-entra-id", { redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "var(--text)",
                fontSize: "0.9rem",
                fontWeight: 500,
                fontFamily: "'Inter',sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Continue with Microsoft
            </button>
          </form>

          {/* Apple */}
          <form
            action={async () => {
              "use server"
              await signIn("apple", { redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.5rem",
                background: "#ffffff",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "#000000",
                fontSize: "0.9rem",
                fontWeight: 500,
                fontFamily: "'Inter',sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Continue with Apple
            </button>
          </form>
        </div>

        <p
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: "0.72rem",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          By continuing you agree to our{" "}
          <a
            href="/legal/terms-of-use"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/legal/privacy-policy"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  )
}
