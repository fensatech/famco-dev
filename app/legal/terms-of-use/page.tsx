import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use — Famco",
  description: "Terms of Use for the Famco Family Command Center application.",
}

export default function TermsOfUsePage() {
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
              📋
            </div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                fontFamily: "'Outfit',sans-serif",
                marginBottom: "0.5rem",
              }}
            >
              Terms of <span className="gradient-text">Use</span>
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
            <Section title="1. Acceptance of Terms">
              <p>
                By accessing or using <strong>Famco — Family Command Center</strong> ("the App",
                "Service"), operated by <strong>Fensatech</strong> ("we", "us", "our"), you agree
                to be bound by these Terms of Use ("Terms"). If you do not agree, please do not use
                the Service.
              </p>
              <p>
                We reserve the right to update these Terms at any time. Continued use of the Service
                after changes are posted constitutes your acceptance of the revised Terms. We will
                notify you of material changes via the email address on your account or via an
                in-app notice.
              </p>
            </Section>

            <Section title="2. Description of Service">
              <p>
                Famco is a family management platform that helps households organise schedules,
                manage family members, connect communication accounts, and coordinate day-to-day
                activities. The Service includes:
              </p>
              <ul>
                <li>Google and Apple account sign-in (OAuth 2.0)</li>
                <li>Email scanning to surface family-relevant information from your Gmail inbox</li>
                <li>Calendar management and event coordination</li>
                <li>Family profile and children profile management</li>
                <li>Location and family preference settings</li>
              </ul>
            </Section>

            <Section title="3. Eligibility">
              <p>
                You must be at least <strong>18 years of age</strong> to create an account and use
                the Service. The Service is intended for use by parents and guardians to manage
                family information. You must not allow children under 13 to create their own
                accounts. Children's information may be added by a parent or guardian on their
                behalf.
              </p>
            </Section>

            <Section title="4. Account Registration & Security">
              <p>
                You may register using your Google or Apple account. You are responsible for
                maintaining the confidentiality of your account credentials and for all activity
                that occurs under your account. You agree to notify us immediately at{" "}
                <a href="mailto:support@fensatech.com" style={{ color: "var(--accent)" }}>
                  support@fensatech.com
                </a>{" "}
                if you suspect unauthorised access.
              </p>
              <p>
                We are not liable for any loss resulting from unauthorised use of your account.
              </p>
            </Section>

            <Section title="5. Gmail & Google Data Access">
              <p>
                When you connect your Google account, you grant Famco permission to read your Gmail
                messages in <em>read-only</em> mode (
                <code>https://www.googleapis.com/auth/gmail.readonly</code>). We use this access
                solely to identify family-relevant emails (e.g., school notices, medical
                appointments, activity bookings).
              </p>
              <p>
                We do not store the full content of your emails. We do not sell, share, or use your
                Gmail data to serve advertising. Our use of Google user data complies with the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)" }}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </Section>

            <Section title="6. Acceptable Use">
              <p>You agree not to:</p>
              <ul>
                <li>Use the Service for any unlawful purpose or in violation of any regulations</li>
                <li>Upload or transmit viruses, malware, or harmful code</li>
                <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
                <li>Use automated tools to scrape, crawl, or extract data from the Service</li>
                <li>Impersonate another person or entity</li>
                <li>Use the Service to harass, abuse, or harm others</li>
              </ul>
            </Section>

            <Section title="7. Intellectual Property">
              <p>
                All content, features, and functionality of the Service — including text, graphics,
                logos, icons, and software — are owned by Fensatech or its licensors and are
                protected by applicable intellectual property laws.
              </p>
              <p>
                You retain ownership of any personal content you upload (e.g., profile photos,
                family details). By submitting content, you grant us a limited, non-exclusive
                licence to store and display that content solely to provide the Service to you.
              </p>
            </Section>

            <Section title="8. Privacy">
              <p>
                Your use of the Service is also governed by our{" "}
                <Link href="/legal/privacy-policy" style={{ color: "var(--accent)" }}>
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference. Please review it carefully.
              </p>
            </Section>

            <Section title="9. Third-Party Services">
              <p>
                The Service integrates with third-party platforms including Google and Apple for
                authentication and data. Your use of those platforms is subject to their own terms
                of service and privacy policies. We are not responsible for the practices of any
                third-party services.
              </p>
            </Section>

            <Section title="10. Disclaimers">
              <p>
                The Service is provided on an <strong>"as is"</strong> and{" "}
                <strong>"as available"</strong> basis without warranties of any kind, either express
                or implied. We do not warrant that the Service will be uninterrupted, error-free, or
                free of viruses or other harmful components.
              </p>
              <p>
                Famco is a personal productivity tool and does not constitute legal, medical,
                financial, or professional advice.
              </p>
            </Section>

            <Section title="11. Limitation of Liability">
              <p>
                To the fullest extent permitted by applicable law, Fensatech and its officers,
                employees, agents, and licensors shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages — including loss of data, loss of
                revenue, or loss of goodwill — arising from your use of or inability to use the
                Service.
              </p>
              <p>
                Our total liability for any claim arising under these Terms shall not exceed the
                amount you paid us in the twelve (12) months preceding the claim, or USD $50,
                whichever is greater.
              </p>
            </Section>

            <Section title="12. Termination">
              <p>
                We may suspend or terminate your access to the Service at any time, with or without
                notice, for any conduct that we believe violates these Terms or is harmful to other
                users, us, or third parties.
              </p>
              <p>
                You may delete your account at any time by contacting us at{" "}
                <a href="mailto:support@fensatech.com" style={{ color: "var(--accent)" }}>
                  support@fensatech.com
                </a>
                . Upon termination, your right to use the Service ceases immediately.
              </p>
            </Section>

            <Section title="13. Governing Law">
              <p>
                These Terms are governed by and construed in accordance with the laws of{" "}
                <strong>England and Wales</strong>, without regard to conflict of law principles.
                Any disputes shall be subject to the exclusive jurisdiction of the courts of England
                and Wales.
              </p>
            </Section>

            <Section title="14. Contact Us">
              <p>
                If you have any questions about these Terms, please contact us:
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
                <strong>Fensatech</strong>
                <br />
                Email:{" "}
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
          <Link href="/legal/privacy-policy" style={{ color: "var(--accent)", textDecoration: "none" }}>
            Privacy Policy
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
