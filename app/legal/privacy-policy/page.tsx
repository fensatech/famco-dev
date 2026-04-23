import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — Famco",
  description: "Privacy Policy for the Famco Family Command Center application.",
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--accent)",
            textDecoration: "none",
            fontSize: "0.85rem",
            marginBottom: "2rem",
          }}
        >
          ← Back to Famco
        </Link>

        <div className="glass fade-up" style={{ padding: "2.5rem 3rem" }}>
          {/* Header */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "linear-gradient(135deg,#6366f1,#c084fc)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                marginBottom: "1.25rem",
                boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              }}
            >
              🔒
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                fontFamily: "'Outfit',sans-serif",
                marginBottom: "0.5rem",
              }}
            >
              Privacy <span className="gradient-text">Policy</span>
            </h1>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Effective date: 18 April 2026 &nbsp;·&nbsp; Last updated: 18 April 2026
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              color: "var(--text)",
              fontSize: "0.9rem",
              lineHeight: 1.8,
            }}
          >
            <p style={{ color: "var(--muted)", fontStyle: "italic" }}>
              Your privacy matters to us. This Policy explains what data we collect, how we use it,
              and your rights over it. We will never sell your personal information.
            </p>

            <Section title="1. Who We Are">
              <p>
                <strong>Famco — Family Command Center</strong> is operated by{" "}
                <strong>Fensatech</strong> ("we", "us", "our"), a software company based in the
                United Kingdom. We act as the <em>data controller</em> for personal information
                collected through the Service.
              </p>
              <p>
                Questions or concerns? Contact our data team at{" "}
                <a href="mailto:privacy@fensatech.com" style={{ color: "var(--accent)" }}>
                  privacy@fensatech.com
                </a>
                .
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following categories of personal information:</p>

              <SubHeading>2.1 Account & Profile Information</SubHeading>
              <ul>
                <li>Name and email address (provided via Google or Apple sign-in)</li>
                <li>Profile preferences and settings you add during onboarding</li>
                <li>Family structure information (members, relationships)</li>
                <li>Children's first names and relevant details you choose to add</li>
                <li>Location information (city/region for localised features)</li>
              </ul>

              <SubHeading>2.2 Google Account Data</SubHeading>
              <ul>
                <li>
                  <strong>Gmail (read-only):</strong> With your explicit consent we access your
                  Gmail inbox in read-only mode to identify family-relevant emails such as school
                  communications, appointment reminders, and activity bookings. We do not store the
                  full body of emails — only extracted metadata and structured data relevant to your
                  family schedule.
                </li>
                <li>
                  <strong>Google OAuth tokens:</strong> We store an encrypted access and refresh
                  token to maintain your connection without requiring repeated sign-in.
                </li>
              </ul>

              <SubHeading>2.3 Usage Data</SubHeading>
              <ul>
                <li>Pages visited and features used within the app</li>
                <li>Timestamps of actions (e.g., onboarding step completion)</li>
                <li>Browser type, device type, and operating system</li>
                <li>IP address (used for security and fraud prevention only)</li>
              </ul>

              <SubHeading>2.4 Calendar & Event Data</SubHeading>
              <ul>
                <li>
                  Events and appointments you create or import into your Famco calendar
                </li>
                <li>
                  Uploaded files or documents you associate with calendar entries
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use your personal information to:</p>
              <ul>
                <li>Create and manage your account and authenticate your identity</li>
                <li>Provide, maintain, and improve the Famco Service</li>
                <li>Personalise your dashboard and family command centre</li>
                <li>Scan Gmail (with your consent) to surface relevant family information</li>
                <li>Send you service-related notifications and updates</li>
                <li>Detect, investigate, and prevent security incidents and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p>
                We do <strong>not</strong> use your data for advertising, profiling for third-party
                marketing, or automated decision-making that produces legal effects on you.
              </p>
            </Section>

            <Section title="4. Legal Basis for Processing (GDPR)">
              <p>
                For users in the United Kingdom and European Economic Area, we process your data
                under the following lawful bases:
              </p>
              <ul>
                <li>
                  <strong>Contract:</strong> Processing necessary to provide the Service you signed
                  up for (account creation, core features)
                </li>
                <li>
                  <strong>Consent:</strong> Gmail access and any optional features you explicitly
                  enable
                </li>
                <li>
                  <strong>Legitimate interests:</strong> Security monitoring, fraud prevention, and
                  improving Service reliability
                </li>
                <li>
                  <strong>Legal obligation:</strong> Compliance with applicable laws and regulations
                </li>
              </ul>
            </Section>

            <Section title="5. Google API Services — Limited Use Disclosure">
              <p>
                Famco's use of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. Specifically:
              </p>
              <ul>
                <li>
                  We only use Gmail data to provide features directly requested by the user within
                  the Famco app
                </li>
                <li>We do not transfer Gmail data to third parties except as necessary to provide the Service</li>
                <li>We do not use Gmail data for advertising purposes</li>
                <li>We do not allow humans to read your Gmail data unless you explicitly request support assistance or it is required for security purposes</li>
              </ul>
            </Section>

            <Section title="6. Children's Privacy">
              <p>
                Famco is designed for use by adults (18+) managing family information. The Service
                is <strong>not directed at children under 13</strong>, and we do not knowingly
                collect personal information directly from children under 13.
              </p>
              <p>
                Parents and guardians may add information about their children within the app (e.g.,
                names, school details). This information is treated with heightened care and is not
                used for any marketing or third-party data sharing.
              </p>
              <p>
                If you believe a child under 13 has created an account without parental consent,
                please contact us at{" "}
                <a href="mailto:privacy@fensatech.com" style={{ color: "var(--accent)" }}>
                  privacy@fensatech.com
                </a>{" "}
                and we will delete the account promptly.
              </p>
            </Section>

            <Section title="7. Data Sharing & Disclosure">
              <p>
                We do not sell your personal information. We may share your data only in the
                following limited circumstances:
              </p>
              <ul>
                <li>
                  <strong>Service providers:</strong> Trusted third-party vendors who assist us in
                  operating the Service (e.g., Microsoft Azure for cloud hosting and database
                  storage). These providers are bound by data processing agreements and may only use
                  your data to provide services to us.
                </li>
                <li>
                  <strong>Authentication providers:</strong> Google and Apple process your
                  authentication credentials under their own privacy policies.
                </li>
                <li>
                  <strong>Legal requirements:</strong> We may disclose your data if required by
                  law, court order, or to protect the rights and safety of Fensatech, our users, or
                  the public.
                </li>
                <li>
                  <strong>Business transfers:</strong> In the event of a merger, acquisition, or
                  sale of assets, your data may be transferred as part of that transaction, subject
                  to equivalent privacy protections.
                </li>
              </ul>
            </Section>

            <Section title="8. Data Storage & Security">
              <p>
                Your data is stored on <strong>Microsoft Azure</strong> infrastructure in the{" "}
                <strong>East US 2</strong> region. We implement industry-standard security measures
                including:
              </p>
              <ul>
                <li>Encryption in transit (TLS 1.2+) and at rest (AES-256)</li>
                <li>Role-based access controls limiting who can access production data</li>
                <li>Regular security reviews and vulnerability assessments</li>
                <li>Azure Front Door WAF for application-layer protection</li>
              </ul>
              <p>
                While we take security seriously, no method of transmission over the internet is
                100% secure. We cannot guarantee absolute security of your data.
              </p>
            </Section>

            <Section title="9. Data Retention">
              <p>
                We retain your personal information for as long as your account is active or as
                needed to provide the Service. Specifically:
              </p>
              <ul>
                <li>
                  <strong>Account data:</strong> Retained until you delete your account, plus up to
                  30 days for backup recovery purposes
                </li>
                <li>
                  <strong>Gmail access tokens:</strong> Deleted immediately upon revoking Google
                  access or deleting your account
                </li>
                <li>
                  <strong>Usage logs:</strong> Retained for up to 12 months for security and
                  performance analysis
                </li>
                <li>
                  <strong>Legal holds:</strong> Data may be retained longer if required by law or
                  an ongoing legal matter
                </li>
              </ul>
            </Section>

            <Section title="10. Your Rights">
              <p>
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                }}
              >
                {[
                  { icon: "👁", right: "Access", desc: "Request a copy of your data" },
                  { icon: "✏️", right: "Rectification", desc: "Correct inaccurate data" },
                  { icon: "🗑", right: "Erasure", desc: "Request deletion of your data" },
                  { icon: "⏸", right: "Restriction", desc: "Limit how we process your data" },
                  { icon: "📦", right: "Portability", desc: "Receive your data in a portable format" },
                  { icon: "🚫", right: "Objection", desc: "Object to certain processing activities" },
                  { icon: "↩️", right: "Withdraw consent", desc: "Revoke consent at any time" },
                ].map(({ icon, right, desc }) => (
                  <div
                    key={right}
                    style={{
                      background: "rgba(99,102,241,0.06)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      borderRadius: "10px",
                      padding: "0.875rem",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>{icon}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{right}</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{desc}</div>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: "1rem" }}>
                To exercise any of these rights, email us at{" "}
                <a href="mailto:privacy@fensatech.com" style={{ color: "var(--accent)" }}>
                  privacy@fensatech.com
                </a>
                . We will respond within 30 days. You also have the right to lodge a complaint with
                the{" "}
                <a
                  href="https://ico.org.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  UK Information Commissioner's Office (ICO)
                </a>
                .
              </p>
            </Section>

            <Section title="11. Cookies & Tracking">
              <p>
                Famco uses session cookies and JWT tokens necessary for authentication and
                maintaining your logged-in state. We do not use third-party advertising cookies or
                tracking pixels.
              </p>
              <ul>
                <li>
                  <strong>Session cookies:</strong> Essential for keeping you signed in — cannot be
                  disabled without breaking core functionality
                </li>
                <li>
                  <strong>Preference cookies:</strong> Store your app settings locally in your
                  browser
                </li>
              </ul>
            </Section>

            <Section title="12. International Data Transfers">
              <p>
                Your data is stored in <strong>Microsoft Azure East US 2</strong> (United States).
                If you are located in the UK or EEA, this constitutes a transfer of personal data
                to a third country. We ensure appropriate safeguards are in place via Microsoft's{" "}
                <a
                  href="https://www.microsoft.com/en-us/trust-center/privacy/gdpr-overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  EU Standard Contractual Clauses
                </a>{" "}
                and participation in UK GDPR adequacy frameworks.
              </p>
            </Section>

            <Section title="13. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we make material changes,
                we will notify you by updating the "Last updated" date at the top of this page and,
                where appropriate, sending a notification to the email address on your account.
              </p>
              <p>
                We encourage you to review this Policy periodically. Your continued use of the
                Service after changes take effect constitutes acceptance of the revised Policy.
              </p>
            </Section>

            <Section title="14. Contact Us">
              <p>
                For any privacy-related questions, data requests, or concerns, please reach out:
              </p>
              <div
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                  marginTop: "0.75rem",
                }}
              >
                <strong>Fensatech — Privacy Team</strong>
                <br />
                Email:{" "}
                <a href="mailto:privacy@fensatech.com" style={{ color: "var(--accent)" }}>
                  privacy@fensatech.com
                </a>
                <br />
                General enquiries:{" "}
                <a href="mailto:support@fensatech.com" style={{ color: "var(--accent)" }}>
                  support@fensatech.com
                </a>
                <br />
                Website:{" "}
                <a
                  href="https://www.fensatech.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  www.fensatech.com
                </a>
              </div>
            </Section>
          </div>
        </div>

        {/* Footer nav */}
        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          <Link href="/legal/terms-of-use" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Terms of Use
          </Link>
          {" · "}
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Back to Famco
          </Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        style={{
          fontSize: "1.05rem",
          fontWeight: 700,
          fontFamily: "'Outfit',sans-serif",
          marginBottom: "0.75rem",
          color: "var(--text)",
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>{children}</div>
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, color: "var(--text)", marginTop: "0.5rem" }}>{children}</p>
  )
}
