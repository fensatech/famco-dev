"use client"
import { useState } from "react"
import { FAMILY_TYPE_OPTIONS } from "@/types"
import type { FamilyInvite, HouseholdMember } from "@/types"
import type { ProfileData, KidRow, PetRow } from "../types"
import { memberColor } from "../lib/events"
import { inputSt, fieldLabelStyle, fieldRowStyle, savePillStyle } from "../styles"
import { AddressSearch } from "../components/AddressSearch"

const TIMEZONES = [
  { value: "America/New_York",             label: "Eastern — New York, Boston" },
  { value: "America/Indiana/Indianapolis", label: "Eastern — Indiana (no DST)" },
  { value: "America/Detroit",              label: "Eastern — Detroit" },
  { value: "America/Chicago",              label: "Central — Chicago, Houston" },
  { value: "America/Indiana/Knox",         label: "Central — Indiana (Knox)" },
  { value: "America/Menominee",            label: "Central — Menominee" },
  { value: "America/Denver",               label: "Mountain — Denver, SLC" },
  { value: "America/Phoenix",              label: "Mountain — Arizona (no DST)" },
  { value: "America/Boise",                label: "Mountain — Boise" },
  { value: "America/Los_Angeles",          label: "Pacific — LA, Seattle" },
  { value: "America/Anchorage",            label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu",             label: "Hawaii" },
  { value: "America/Toronto",              label: "Eastern — Toronto" },
  { value: "America/Winnipeg",             label: "Central — Winnipeg" },
  { value: "America/Regina",               label: "Central — Saskatchewan" },
  { value: "America/Edmonton",             label: "Mountain — Edmonton" },
  { value: "America/Vancouver",            label: "Pacific — Vancouver" },
  { value: "America/Halifax",              label: "Atlantic — Halifax" },
  { value: "America/St_Johns",             label: "Newfoundland — St. John's" },
]

const WORK_TYPES = [
  { value: "wfh", label: "Work from Home", icon: "🏠" },
  { value: "office", label: "Office", icon: "🏢" },
  { value: "hybrid", label: "Hybrid", icon: "🔀" },
]

const PET_TYPES = [
  { value: "dog", label: "Dog", icon: "🐕" },
  { value: "cat", label: "Cat", icon: "🐈" },
  { value: "rabbit", label: "Rabbit", icon: "🐇" },
  { value: "bird", label: "Bird", icon: "🐦" },
  { value: "fish", label: "Fish", icon: "🐠" },
  { value: "hamster", label: "Hamster", icon: "🐹" },
  { value: "other", label: "Other", icon: "🐾" },
]

const GRADE_OPTIONS = [
  "Preschool",
  "Pre-K",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
]

function FamilyTreeCard({ name, subtitle, color, icon }: { name: string; subtitle: string; color: string; icon: string }) {
  return (
    <div style={{ background: `${color}12`, border: `1.5px solid ${color}35`, borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "center", minWidth: "110px", maxWidth: "160px" }}>
      <div style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", color, marginBottom: "0.2rem", lineHeight: 1.3 }}>{name}</div>
      <div style={{ fontSize: "0.65rem", color: "var(--muted)", lineHeight: 1.4 }}>{subtitle || "—"}</div>
    </div>
  )
}

function SettingsSection({ title, icon, children, accent, bg }: { title: string; icon: string; children: React.ReactNode; accent?: string; bg?: string }) {
  return (
    <div style={{ background: bg ?? "rgba(255,255,255,0.025)", border: `1px solid ${accent ? accent + "30" : "var(--border)"}`, borderRadius: "16px", padding: "1.5rem" }}>
      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: accent ?? "var(--text)" }}>
        <span>{icon}</span>{title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{children}</div>
    </div>
  )
}

type EditKid = { id: string; firstName: string; lastName: string; dob: string; schoolName: string; grade: string; daycareName: string; daycareAddress: string }
type EditPet = { id: string; name: string; animalType: string; breed: string; dob: string }

interface Props {
  profile: ProfileData
  kids: KidRow[]
  setKids: (k: KidRow[]) => void
  pets: PetRow[]
  setPets: (p: PetRow[]) => void
  invites: FamilyInvite[]
  householdMembers: HouseholdMember[]
  onInvite: (data: { invitee_email: string; invited_name?: string; relation: string; role: string }) => Promise<boolean>
  onRevokeInvite: (id: string) => Promise<boolean>
}

export function SettingsTab({ profile: initialProfile, kids, setKids, pets, setPets, invites, householdMembers, onInvite, onRevokeInvite }: Props) {
  const [draft, setDraft] = useState({
    firstName: initialProfile.firstName, lastName: initialProfile.lastName,
    phone: initialProfile.phone, familyType: initialProfile.familyType,
    city: initialProfile.city, timezone: initialProfile.timezone,
    addressStreet: initialProfile.addressStreet, addressProvince: initialProfile.addressProvince,
    addressPostal: initialProfile.addressPostal, addressCountry: initialProfile.addressCountry,
    workType: initialProfile.workType, workAddress: initialProfile.workAddress,
    spouseFirstName: initialProfile.spouseFirstName, spouseLastName: initialProfile.spouseLastName,
    spousePhone: initialProfile.spousePhone, spouseEmail: initialProfile.spouseEmail,
    spouseWorkType: initialProfile.spouseWorkType, spouseWorkAddress: initialProfile.spouseWorkAddress,
  })
  const [editKids, setEditKids] = useState<EditKid[]>(kids.map((k) => ({ id: k.id, firstName: k.firstName ?? "", lastName: k.lastName ?? "", dob: k.dob ?? "", schoolName: k.schoolName ?? "", grade: k.grade ?? "", daycareName: k.daycareName ?? "", daycareAddress: k.daycareAddress ?? "" })))
  const [editPets, setEditPets] = useState<EditPet[]>(pets.map((p) => ({ id: p.id, name: p.name, animalType: p.animalType, breed: p.breed ?? "", dob: p.dob ?? "" })))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [inviteDraft, setInviteDraft] = useState({ invited_name: "", invitee_email: "", relation: "family_member", role: "member" })
  const [inviteSaving, setInviteSaving] = useState(false)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)

  const hasSpouse = draft.familyType !== "single_parent"
  const countryHint = draft.addressCountry || "Canada"
  function sf<K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) { setDraft((p) => ({ ...p, [key]: val })) }
  function sk(i: number, key: keyof EditKid, val: string) { setEditKids((prev) => prev.map((k, idx) => idx === i ? { ...k, [key]: val } : k)) }
  function sp(i: number, key: keyof EditPet, val: string) { setEditPets((prev) => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p)) }

  async function handleInvite() {
    if (!inviteDraft.invitee_email.trim()) return
    setInviteSaving(true)
    const ok = await onInvite({
      invitee_email: inviteDraft.invitee_email.trim(),
      invited_name: inviteDraft.invited_name.trim() || undefined,
      relation: inviteDraft.relation,
      role: inviteDraft.role,
    })
    setInviteSaving(false)
    if (ok) setInviteDraft({ invited_name: "", invitee_email: "", relation: "family_member", role: "member" })
  }

  async function copyInviteLink(invite: FamilyInvite) {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    await navigator.clipboard.writeText(`${origin}/?invite=${invite.token}`)
    setCopiedInviteId(invite.id)
    window.setTimeout(() => setCopiedInviteId(null), 2000)
  }

  async function saveAll() {
    if (!draft.city.trim() || !draft.timezone) return
    setSaving(true)
    const validKids = editKids.filter((k) => k.firstName.trim() || k.lastName.trim())
    const validPets = editPets.filter((p) => p.name.trim() && p.animalType)
    await Promise.all([
      fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: draft.firstName || null, last_name: draft.lastName || null,
          phone: draft.phone || null, family_type: draft.familyType || null,
          city: draft.city || null, timezone: draft.timezone || null,
          address_street: draft.addressStreet || null, address_province: draft.addressProvince || null,
          address_postal: draft.addressPostal || null, address_country: draft.addressCountry || null,
          work_type: draft.workType || null, work_address: draft.workAddress || null,
          spouse_first_name: draft.spouseFirstName || null, spouse_last_name: draft.spouseLastName || null,
          spouse_phone: draft.spousePhone || null, spouse_email: draft.spouseEmail || null,
          spouse_work_type: draft.spouseWorkType || null, spouse_work_address: draft.spouseWorkAddress || null,
        }),
      }),
      fetch("/api/kids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kids: validKids.map((k) => ({ first_name: k.firstName.trim(), last_name: k.lastName.trim(), dob: k.dob || null, school_name: k.schoolName.trim() || null, grade: k.grade.trim() || null, daycare_name: k.daycareName.trim() || null, daycare_address: k.daycareAddress.trim() || null })) }),
      }),
      fetch("/api/migrate", { method: "POST" }).catch(() => {}),
      fetch("/api/pets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pets: validPets.map((p) => ({ name: p.name.trim(), animal_type: p.animalType, breed: p.breed.trim() || null, dob: p.dob || null })) }),
      }).catch(() => {}),
    ])
    setKids(validKids.map((k) => ({ id: k.id, name: [k.firstName, k.lastName].filter(Boolean).join(" "), firstName: k.firstName || null, lastName: k.lastName || null, dob: k.dob || null, schoolName: k.schoolName || null, grade: k.grade || null, daycareName: k.daycareName || null, daycareAddress: k.daycareAddress || null })))
    setPets(validPets.map((p) => ({ id: p.id, name: p.name, animalType: p.animalType, breed: p.breed || null, dob: p.dob || null })))
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
  }

  const parentName = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || "You"
  const spouseName = [draft.spouseFirstName, draft.spouseLastName].filter(Boolean).join(" ") || "Partner"

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.2rem" }}>Manage Family</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.8rem" }}>This is how Famco learns your family. Names, schools, activities, and work schedules train the AI — the more complete your profile, the more relevant your Insights, smarter email scanning, and accurate reminders.</p>
        </div>
        <button onClick={saveAll} disabled={saving || !draft.city.trim() || !draft.timezone} style={{ ...savePillStyle, padding: "0.65rem 1.75rem", fontSize: "0.875rem", background: saved ? "linear-gradient(135deg,#4ade80,#22c55e)" : saving ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)" }}>
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Family Tree */}
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.75rem", overflow: "hidden" }}>
          <h3 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.5rem" }}>Family Tree</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <FamilyTreeCard name={parentName} subtitle={draft.workType ? WORK_TYPES.find((w) => w.value === draft.workType)?.label ?? "Parent" : "Parent"} color="#818cf8" icon="👤" />
            {hasSpouse && <FamilyTreeCard name={spouseName} subtitle="Partner" color="#f472b6" icon="👤" />}
          </div>
          {editKids.filter((k) => k.firstName || k.lastName).length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", margin: "0.75rem 0" }}>
              <div style={{ width: "2px", height: "28px", background: "linear-gradient(180deg,rgba(129,140,248,0.5),rgba(244,114,182,0.5))" }} />
            </div>
          )}
          {editKids.filter((k) => k.firstName || k.lastName).length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              {editKids.filter((k) => k.firstName || k.lastName).map((k, i) => (
                <FamilyTreeCard key={i} name={[k.firstName, k.lastName].filter(Boolean).join(" ")} subtitle={k.grade ? k.grade : k.schoolName ? k.schoolName : "Child"} color={memberColor(i + 1)} icon="👧" />
              ))}
            </div>
          )}
          {editPets.filter((p) => p.name).length > 0 && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", textAlign: "center", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pets</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                {editPets.filter((p) => p.name).map((p, i) => {
                  const pt = PET_TYPES.find((t) => t.value === p.animalType)
                  return <FamilyTreeCard key={i} name={p.name} subtitle={[pt?.label, p.breed].filter(Boolean).join(" · ")} color="#fbbf24" icon={pt?.icon ?? "🐾"} />
                })}
              </div>
            </div>
          )}
        </div>

        <SettingsSection title="Household Access" icon="✉️" accent="#22c55e" bg="rgba(34,197,94,0.06)">
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Invite a partner, co-parent, or caregiver after signup. Famco keeps onboarding light, then turns this page into the household source of truth for shared access, better reminders, and more accurate Insights.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active household members
            </div>
            {householdMembers.length === 0 ? (
              <div style={{ padding: "0.9rem 1rem", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.08)", color: "var(--muted)", fontSize: "0.76rem" }}>
                You are the only active household member right now.
              </div>
            ) : (
              householdMembers.map((member) => {
                const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email
                return (
                  <div key={member.profile_id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.85rem 1rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "12px", background: "rgba(34,197,94,0.12)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{name}</span>
                        <span style={{ fontSize: "0.66rem", padding: "0.08rem 0.42rem", borderRadius: "999px", background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.18)", fontWeight: 700 }}>
                          {member.role.replace("_", " ")}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{member.relation.replace("_", " ")}</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.18rem" }}>{member.email}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 0.9fr 0.9fr auto", gap: "0.625rem", alignItems: "end" }}>
            <div>
              <label style={fieldLabelStyle}>Name</label>
              <input style={{ ...inputSt, marginTop: "0.25rem" }} value={inviteDraft.invited_name} onChange={(e) => setInviteDraft((prev) => ({ ...prev, invited_name: e.target.value }))} placeholder="Jordan" />
            </div>
            <div>
              <label style={fieldLabelStyle}>Email</label>
              <input style={{ ...inputSt, marginTop: "0.25rem" }} value={inviteDraft.invitee_email} onChange={(e) => setInviteDraft((prev) => ({ ...prev, invitee_email: e.target.value }))} placeholder="name@email.com" />
            </div>
            <div>
              <label style={fieldLabelStyle}>Relation</label>
              <select style={{ ...inputSt, marginTop: "0.25rem" }} value={inviteDraft.relation} onChange={(e) => setInviteDraft((prev) => ({ ...prev, relation: e.target.value }))}>
                <option value="partner">Partner</option>
                <option value="co_parent">Co-parent</option>
                <option value="family_member">Family member</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </div>
            <div>
              <label style={fieldLabelStyle}>Role</label>
              <select style={{ ...inputSt, marginTop: "0.25rem" }} value={inviteDraft.role} onChange={(e) => setInviteDraft((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="adult">Adult</option>
                <option value="co_parent">Co-parent</option>
              </select>
            </div>
            <button onClick={() => void handleInvite()} disabled={inviteSaving || !inviteDraft.invitee_email.trim()} style={{ ...savePillStyle, alignSelf: "stretch", minWidth: "110px" }}>
              {inviteSaving ? "Sending…" : "Invite"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {invites.length === 0 ? (
              <div style={{ padding: "0.9rem 1rem", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.08)", color: "var(--muted)", fontSize: "0.76rem" }}>
                No invitations yet. Start with your partner or co-parent, then expand the household later.
              </div>
            ) : invites.map((invite) => (
              <div key={invite.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.85rem 1rem", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{invite.invited_name || invite.invitee_email}</span>
                    <span style={{ fontSize: "0.66rem", padding: "0.08rem 0.42rem", borderRadius: "999px", background: invite.status === "accepted" ? "rgba(34,197,94,0.12)" : invite.status === "revoked" ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.12)", color: invite.status === "accepted" ? "#22c55e" : invite.status === "revoked" ? "#f87171" : "#fbbf24", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }}>
                      {invite.status}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)" }}>{invite.relation.replace("_", " ")} · {invite.role.replace("_", " ")}</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.18rem" }}>{invite.invitee_email}</div>
                </div>
                {invite.status === "pending" && (
                  <>
                    <button onClick={() => void copyInviteLink(invite)} style={{ borderRadius: "8px", border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: "0.72rem", fontWeight: 700, padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                      {copiedInviteId === invite.id ? "Copied" : "Copy link"}
                    </button>
                    <button onClick={() => void onRevokeInvite(invite.id)} style={{ borderRadius: "8px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: "0.72rem", fontWeight: 700, padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                      Revoke
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </SettingsSection>

        {/* Family Type */}
        <SettingsSection title="Family Type" icon="👨‍👩‍👧‍👦" accent="#60a5fa" bg="rgba(96,165,250,0.07)">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
            {FAMILY_TYPE_OPTIONS.map((opt) => {
              const active = draft.familyType === opt.value
              return (
                <button key={opt.value} onClick={() => sf("familyType", opt.value)} style={{ textAlign: "left", padding: "0.875rem", borderRadius: "12px", cursor: "pointer", background: active ? "rgba(96,165,250,0.18)" : "rgba(255,255,255,0.03)", border: active ? "1.5px solid rgba(96,165,250,0.6)" : "1px solid var(--border)", transition: "all 0.15s" }}>
                  <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{opt.icon}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: active ? "#60a5fa" : "var(--text)" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem", lineHeight: 1.4 }}>{opt.description}</div>
                </button>
              )
            })}
          </div>
        </SettingsSection>

        {/* Personal Info + Spouse */}
        <div style={{ display: "grid", gridTemplateColumns: hasSpouse ? "1fr 1fr" : "1fr", gap: "1rem" }}>
          <SettingsSection title="Your Information" icon="👤" accent="#818cf8" bg="rgba(99,102,241,0.07)">
            <div style={fieldRowStyle}>
              <label style={fieldLabelStyle}>Email</label>
              <div style={{ ...inputSt, color: "var(--muted)", background: "rgba(255,255,255,0.02)", cursor: "not-allowed" }}>{initialProfile.email}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              <div><label style={fieldLabelStyle}>First Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.firstName} onChange={(e) => sf("firstName", e.target.value)} placeholder="First name" /></div>
              <div><label style={fieldLabelStyle}>Last Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.lastName} onChange={(e) => sf("lastName", e.target.value)} placeholder="Last name" /></div>
            </div>
            <div style={fieldRowStyle}><label style={fieldLabelStyle}>Phone</label><input type="tel" style={inputSt} value={draft.phone} onChange={(e) => sf("phone", e.target.value)} placeholder="+1 (555) 000-0000" /></div>
            <div style={fieldRowStyle}>
              <label style={fieldLabelStyle}>Work Type</label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {WORK_TYPES.map((w) => <button key={w.value} onClick={() => sf("workType", w.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${draft.workType === w.value ? "#818cf8" : "rgba(255,255,255,0.1)"}`, background: draft.workType === w.value ? "rgba(129,140,248,0.18)" : "none", color: draft.workType === w.value ? "#818cf8" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{w.icon} {w.label}</button>)}
              </div>
            </div>
            {draft.workType && draft.workType !== "wfh" && (
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>Work Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
                <AddressSearch simpleMode countryHint={countryHint} value={draft.workAddress} onChange={(v) => sf("workAddress", v)} onSelectSimple={(v) => sf("workAddress", v)} placeholder="Search office address…" />
              </div>
            )}
          </SettingsSection>

          {hasSpouse && (
            <SettingsSection title="Spouse / Partner" icon="💑" accent="#f472b6" bg="rgba(244,114,182,0.07)">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div><label style={fieldLabelStyle}>First Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.spouseFirstName} onChange={(e) => sf("spouseFirstName", e.target.value)} placeholder="First name" /></div>
                <div><label style={fieldLabelStyle}>Last Name</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.spouseLastName} onChange={(e) => sf("spouseLastName", e.target.value)} placeholder="Last name" /></div>
              </div>
              <div style={fieldRowStyle}><label style={fieldLabelStyle}>Phone</label><input type="tel" style={inputSt} value={draft.spousePhone} onChange={(e) => sf("spousePhone", e.target.value)} placeholder="+1 (555) 000-0000" /></div>
              <div style={fieldRowStyle}><label style={fieldLabelStyle}>Email</label><input type="email" style={inputSt} value={draft.spouseEmail} onChange={(e) => sf("spouseEmail", e.target.value)} placeholder="spouse@email.com" /></div>
              <div style={fieldRowStyle}>
                <label style={fieldLabelStyle}>Work Type</label>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {WORK_TYPES.map((w) => <button key={w.value} onClick={() => sf("spouseWorkType", w.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${draft.spouseWorkType === w.value ? "#f472b6" : "rgba(255,255,255,0.1)"}`, background: draft.spouseWorkType === w.value ? "rgba(244,114,182,0.18)" : "none", color: draft.spouseWorkType === w.value ? "#f472b6" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{w.icon} {w.label}</button>)}
                </div>
              </div>
              {draft.spouseWorkType && draft.spouseWorkType !== "wfh" && (
                <div style={fieldRowStyle}>
                  <label style={fieldLabelStyle}>Work Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
                  <AddressSearch simpleMode countryHint={countryHint} value={draft.spouseWorkAddress} onChange={(v) => sf("spouseWorkAddress", v)} onSelectSimple={(v) => sf("spouseWorkAddress", v)} placeholder="Search office address…" />
                </div>
              )}
            </SettingsSection>
          )}
        </div>

        {/* Home Location */}
        <SettingsSection title="Home Location" icon="📍" accent="#34d399" bg="rgba(52,211,153,0.07)">
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Street Address <span style={{ fontSize: "0.65rem", fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#818cf8" }}>— search to auto-fill</span></label>
            <AddressSearch
              countryHint={countryHint}
              value={draft.addressStreet}
              onChange={(v) => sf("addressStreet", v)}
              onSelect={({ street, city, province, postal, country }) => {
                sf("addressStreet", street)
                if (city) sf("city", city)
                if (province) sf("addressProvince", province)
                if (postal) sf("addressPostal", postal)
                if (country) sf("addressCountry", country)
              }}
              placeholder="123 Main St, Calgary…"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
            <div><label style={fieldLabelStyle}>City <span style={{ color: "#f87171" }}>*</span></label><input style={{ ...inputSt, marginTop: "0.25rem", borderColor: !draft.city.trim() ? "rgba(248,113,113,0.5)" : undefined }} value={draft.city} onChange={(e) => sf("city", e.target.value)} placeholder="City" /></div>
            <div><label style={fieldLabelStyle}>Province / State</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.addressProvince} onChange={(e) => sf("addressProvince", e.target.value)} placeholder="AB" /></div>
            <div><label style={fieldLabelStyle}>Postal / ZIP</label><input style={{ ...inputSt, marginTop: "0.25rem" }} value={draft.addressPostal} onChange={(e) => sf("addressPostal", e.target.value)} placeholder="T2Z 0G5" /></div>
          </div>
          <div style={fieldRowStyle}><label style={fieldLabelStyle}>Country</label><input style={inputSt} value={draft.addressCountry} onChange={(e) => sf("addressCountry", e.target.value)} placeholder="Canada" /></div>
          <div style={fieldRowStyle}>
            <label style={fieldLabelStyle}>Timezone <span style={{ color: "#f87171" }}>*</span></label>
            <select value={draft.timezone} onChange={(e) => sf("timezone", e.target.value)} style={{ ...inputSt, cursor: "pointer", appearance: "none", borderColor: !draft.timezone ? "rgba(248,113,113,0.5)" : undefined }}>
              <option value="">Select timezone</option>
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </div>
        </SettingsSection>

        {/* Children */}
        <SettingsSection title="Children" icon="👧" accent="#f472b6" bg="rgba(244,114,182,0.07)">
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {editKids.map((kid, i) => (
              <div key={i} style={{ background: `${memberColor(i + 1)}08`, border: `1px solid ${memberColor(i + 1)}25`, borderRadius: "14px", padding: "1.25rem", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: memberColor(i + 1), textTransform: "uppercase", letterSpacing: "0.05em" }}>Child {i + 1}</span>
                  <button onClick={() => setEditKids((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Remove</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div><label style={fieldLabelStyle}>First Name</label><input value={kid.firstName} placeholder="First name" onChange={(e) => sk(i, "firstName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Last Name</label><input value={kid.lastName} placeholder="Last name" onChange={(e) => sk(i, "lastName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Date of Birth</label><input type="date" value={kid.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => sk(i, "dob", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div><label style={fieldLabelStyle}>School Name</label><input value={kid.schoolName} placeholder="e.g. Fairview School" onChange={(e) => sk(i, "schoolName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div>
                    <label style={fieldLabelStyle}>Grade / Year</label>
                    <select value={kid.grade} onChange={(e) => sk(i, "grade", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer", appearance: "none" }}>
                      <option value="">Select grade</option>
                      {kid.grade && !GRADE_OPTIONS.includes(kid.grade) ? <option value={kid.grade}>{kid.grade}</option> : null}
                      {GRADE_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  <div><label style={fieldLabelStyle}>Daycare / Nursery</label><input value={kid.daycareName} placeholder="Name (optional)" onChange={(e) => sk(i, "daycareName", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div>
                    <label style={fieldLabelStyle}>Daycare Address</label>
                    <AddressSearch simpleMode countryHint={countryHint} value={kid.daycareAddress} onChange={(v) => sk(i, "daycareAddress", v)} onSelectSimple={(v) => sk(i, "daycareAddress", v)} placeholder="Search address…" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setEditKids((prev) => [...prev, { id: "", firstName: "", lastName: "", dob: "", schoolName: "", grade: "", daycareName: "", daycareAddress: "" }])} style={{ background: "none", border: "2px dashed rgba(244,114,182,0.3)", borderRadius: "12px", padding: "0.75rem", color: "#f472b6", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", width: "100%" }}>+ Add Child</button>
          </div>
        </SettingsSection>

        {/* Pets */}
        <SettingsSection title="Pets" icon="🐾" accent="#fbbf24" bg="rgba(251,191,36,0.06)">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {editPets.map((pet, i) => (
              <div key={i} style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "14px", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>{PET_TYPES.find((t) => t.value === pet.animalType)?.icon ?? "🐾"} Pet {i + 1}</span>
                  <button onClick={() => setEditPets((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "6px", color: "#f87171", cursor: "pointer", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Remove</button>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {PET_TYPES.map((t) => <button key={t.value} onClick={() => sp(i, "animalType", t.value)} style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", border: `1.5px solid ${pet.animalType === t.value ? "#fbbf24" : "rgba(255,255,255,0.1)"}`, background: pet.animalType === t.value ? "rgba(251,191,36,0.15)" : "none", color: pet.animalType === t.value ? "#fbbf24" : "var(--muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{t.icon} {t.label}</button>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
                  <div><label style={fieldLabelStyle}>Name</label><input value={pet.name} placeholder="Pet's name" onChange={(e) => sp(i, "name", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Breed (optional)</label><input value={pet.breed} placeholder="e.g. Labrador" onChange={(e) => sp(i, "breed", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem" }} /></div>
                  <div><label style={fieldLabelStyle}>Date of Birth</label><input type="date" value={pet.dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => sp(i, "dob", e.target.value)} style={{ ...inputSt, marginTop: "0.25rem", colorScheme: "dark" }} /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setEditPets((prev) => [...prev, { id: "", name: "", animalType: "dog", breed: "", dob: "" }])} style={{ background: "none", border: "2px dashed rgba(251,191,36,0.3)", borderRadius: "12px", padding: "0.75rem", color: "#fbbf24", fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", width: "100%" }}>+ Add Pet</button>
          </div>
        </SettingsSection>

      </div>
    </>
  )
}
