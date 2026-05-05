"use client"

import { useMemo, useState } from "react"
import type { FamilyDocumentCategory } from "@/types"
import type { CalendarMemberOption, DocumentRow } from "../types"
import { fieldLabelStyle, inputSt, savePillStyle, sectionCard } from "../styles"

const DOC_CATEGORIES: { value: FamilyDocumentCategory; label: string; icon: string; color: string }[] = [
  { value: "school", label: "School", icon: "🎒", color: "#818cf8" },
  { value: "medical", label: "Medical", icon: "🩺", color: "#34d399" },
  { value: "insurance", label: "Insurance", icon: "🛡️", color: "#06b6d4" },
  { value: "id", label: "IDs", icon: "🪪", color: "#f59e0b" },
  { value: "household", label: "Household", icon: "🏠", color: "#3b82f6" },
  { value: "pet", label: "Pet", icon: "🐾", color: "#fbbf24" },
  { value: "finance", label: "Finance", icon: "💳", color: "#fb7185" },
  { value: "other", label: "Other", icon: "📄", color: "#94a3b8" },
]

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

interface Props {
  documents: DocumentRow[]
  memberOptions: CalendarMemberOption[]
  onDocumentsChange: (next: DocumentRow[]) => void
  canManageDocuments?: boolean
}

export function DocumentsTab({ documents, memberOptions, onDocumentsChange, canManageDocuments = true }: Props) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<FamilyDocumentCategory>("school")
  const [memberName, setMemberName] = useState("Family")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<FamilyDocumentCategory | "all">("all")

  const memberChoices = useMemo(
    () => ["Family", ...memberOptions.map((option) => option.name)].filter((name, index, list) => list.indexOf(name) === index),
    [memberOptions],
  )

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return documents.filter((document) => {
      if (categoryFilter !== "all" && document.category !== categoryFilter) return false
      if (!query) return true
      return [document.title, document.file_name, document.member_name, document.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [categoryFilter, documents, search])

  async function handleUpload() {
    if (!canManageDocuments || !file) return
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("title", title.trim() || file.name.replace(/\.[^.]+$/, ""))
    formData.set("category", category)
    formData.set("member_name", memberName === "Family" ? "" : memberName)
    formData.set("notes", notes.trim())
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "Upload failed")
        setUploading(false)
        return
      }
      const next = [body.document as DocumentRow, ...documents]
      onDocumentsChange(next)
      setTitle("")
      setCategory("school")
      setMemberName("Family")
      setNotes("")
      setFile(null)
      const input = document.getElementById("document-upload-input") as HTMLInputElement | null
      if (input) input.value = ""
    } catch {
      setError("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!canManageDocuments) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (res.ok) {
        onDocumentsChange(documents.filter((document) => document.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ marginBottom: "0.2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, fontFamily: "'Outfit',sans-serif", marginBottom: "0.25rem" }}>Document Vault</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6 }}>
          Keep school forms, insurance details, pet records, and household paperwork together in one secure family vault.
        </p>
      </div>

      <div style={{ ...sectionCard, padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Upload a document</div>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>Accepted now: PDF, JPG, PNG, DOC, DOCX up to 10 MB.</div>
          </div>
          <div style={{ padding: "0.45rem 0.8rem", borderRadius: "999px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", fontSize: "0.72rem", color: "#3b82f6", fontWeight: 700 }}>
            {documents.length} saved document{documents.length === 1 ? "" : "s"}
          </div>
        </div>

        {!canManageDocuments && (
          <div style={{ marginBottom: "1rem", borderRadius: "12px", padding: "0.8rem 0.9rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.55 }}>
            You have view-only access to the shared document vault. Only adults, co-parents, or the owner can upload or delete household files.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div>
            <label style={fieldLabelStyle}>Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Jaberyl school registration form" style={{ ...inputSt, marginTop: "0.25rem" }} />
          </div>
          <div>
            <label style={fieldLabelStyle}>Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value as FamilyDocumentCategory)} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}>
              {DOC_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={fieldLabelStyle}>Family Member</label>
            <select value={memberName} onChange={(event) => setMemberName(event.target.value)} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}>
              {memberChoices.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
          <div>
            <label style={fieldLabelStyle}>Notes</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note or context…" rows={3} style={{ ...inputSt, marginTop: "0.25rem", resize: "vertical", minHeight: "88px" }} />
          </div>
          <div>
            <label style={fieldLabelStyle}>File</label>
            <label style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.45rem", marginTop: "0.25rem", minHeight: "88px", borderRadius: "14px", border: "1.5px dashed rgba(59,130,246,0.28)", background: "rgba(59,130,246,0.05)", padding: "1rem", cursor: canManageDocuments ? "pointer" : "not-allowed", opacity: canManageDocuments ? 1 : 0.75 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b82f6" }}>{file ? file.name : "Click to browse or drop a file here"}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{file ? formatBytes(file.size) : "PDF, image, or document file"}</span>
              <input
                id="document-upload-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                style={{ display: "none" }}
                disabled={!canManageDocuments}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <div style={{ fontSize: "0.76rem", color: error ? "#ef4444" : "var(--muted)" }}>
            {error ?? "Documents are stored per household, so invited members can see the same shared vault."}
          </div>
          <button onClick={() => void handleUpload()} disabled={!canManageDocuments || !file || uploading} style={{ ...savePillStyle, padding: "0.65rem 1.15rem", opacity: !canManageDocuments || !file || uploading ? 0.55 : 1, cursor: !canManageDocuments || !file || uploading ? "not-allowed" : "pointer" }}>
            {uploading ? "Uploading…" : "Upload Document"}
          </button>
        </div>
      </div>

      <div style={{ ...sectionCard, padding: "1rem 1.1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.75rem" }}>
          <div>
            <label style={fieldLabelStyle}>Search documents</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, member, notes, or filename…" style={{ ...inputSt, marginTop: "0.25rem" }} />
          </div>
          <div>
            <label style={fieldLabelStyle}>Filter by category</label>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as FamilyDocumentCategory | "all")} style={{ ...inputSt, marginTop: "0.25rem", cursor: "pointer" }}>
              <option value="all">All categories</option>
              {DOC_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "0.9rem" }}>
        {DOC_CATEGORIES.map((item) => {
          const count = documents.filter((document) => document.category === item.value).length
          return (
            <div key={item.value} style={{ background: `${item.color}0f`, border: `1px solid ${item.color}2a`, borderRadius: "16px", padding: "1rem" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "0.2rem" }}>{item.icon}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: item.color }}>{item.label}</div>
              <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginTop: "0.18rem" }}>{count} document{count === 1 ? "" : "s"}</div>
            </div>
          )
        })}
      </div>

      {documents.length === 0 ? (
        <div style={{ ...sectionCard, padding: "2rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem", marginBottom: "0.7rem" }}>🗂️</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.25rem" }}>No documents saved yet</div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>
            Start with a school form, insurance card, medical referral, or pet vaccination record so your household has one dependable place for important files.
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div style={{ ...sectionCard, padding: "1.6rem", textAlign: "center", color: "var(--muted)" }}>
          No documents match this search right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredDocuments.map((document) => {
            const categoryMeta = DOC_CATEGORIES.find((item) => item.value === document.category) ?? DOC_CATEGORIES[DOC_CATEGORIES.length - 1]
            const canPreview = /^image\//.test(document.content_type ?? "") || document.file_name.toLowerCase().endsWith(".pdf")
            return (
              <div key={document.id} style={{ ...sectionCard, padding: "1rem 1.1rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "0.85rem", minWidth: 0, flex: 1 }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "14px", background: `${categoryMeta.color}18`, color: categoryMeta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>
                      {categoryMeta.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.18rem" }}>
                        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)" }}>{document.title}</span>
                        <span style={{ fontSize: "0.68rem", padding: "0.14rem 0.46rem", borderRadius: "999px", background: `${categoryMeta.color}14`, color: categoryMeta.color, border: `1px solid ${categoryMeta.color}26`, fontWeight: 700 }}>
                          {categoryMeta.label}
                        </span>
                        {document.member_name && (
                          <span style={{ fontSize: "0.66rem", color: "var(--muted)" }}>{document.member_name}</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.5 }}>
                        {document.file_name} · {formatBytes(document.byte_size)} · Uploaded {formatDate(document.created_at)}
                      </div>
                      {document.notes && (
                        <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.4rem", lineHeight: 1.55 }}>
                          {document.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {canPreview && (
                      <a
                        href={`/api/documents/${document.id}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...savePillStyle, background: "linear-gradient(135deg,#14b8a6,#3b82f6)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      >
                        Preview
                      </a>
                    )}
                    <a
                      href={`/api/documents/${document.id}/download`}
                      style={{ ...savePillStyle, background: "linear-gradient(135deg,#3b82f6,#06b6d4)", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      Download
                    </a>
                    {canManageDocuments && (
                      <button
                        onClick={() => void handleDelete(document.id)}
                        disabled={deletingId === document.id}
                        style={{ ...savePillStyle, background: "linear-gradient(135deg,#fb7185,#ef4444)", opacity: deletingId === document.id ? 0.6 : 1 }}
                      >
                        {deletingId === document.id ? "Deleting…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
