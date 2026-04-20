"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

// ── North American cities ─────────────────────────────────────────────────────
const CITIES = [
  // USA — Major cities by state
  "New York, NY","Los Angeles, CA","Chicago, IL","Houston, TX","Phoenix, AZ",
  "Philadelphia, PA","San Antonio, TX","San Diego, CA","Dallas, TX","San Jose, CA",
  "Austin, TX","Jacksonville, FL","Fort Worth, TX","Columbus, OH","Charlotte, NC",
  "Indianapolis, IN","San Francisco, CA","Seattle, WA","Denver, CO","Nashville, TN",
  "Oklahoma City, OK","El Paso, TX","Washington, DC","Las Vegas, NV","Louisville, KY",
  "Memphis, TN","Portland, OR","Baltimore, MD","Milwaukee, WI","Albuquerque, NM",
  "Tucson, AZ","Fresno, CA","Sacramento, CA","Kansas City, MO","Mesa, AZ",
  "Atlanta, GA","Omaha, NE","Colorado Springs, CO","Raleigh, NC","Long Beach, CA",
  "Virginia Beach, VA","Minneapolis, MN","Tampa, FL","New Orleans, LA","Arlington, TX",
  "Bakersfield, CA","Honolulu, HI","Anaheim, CA","Aurora, CO","Santa Ana, CA",
  "Corpus Christi, TX","Riverside, CA","Lexington, KY","St. Louis, MO","Pittsburgh, PA",
  "Stockton, CA","Anchorage, AK","Cincinnati, OH","St. Paul, MN","Greensboro, NC",
  "Toledo, OH","Newark, NJ","Plano, TX","Henderson, NV","Orlando, FL",
  "Lincoln, NE","Jersey City, NJ","Chandler, AZ","St. Petersburg, FL","Laredo, TX",
  "Norfolk, VA","Madison, WI","Durham, NC","Lubbock, TX","Winston-Salem, NC",
  "Garland, TX","Glendale, AZ","Hialeah, FL","Reno, NV","Baton Rouge, LA",
  "Irvine, CA","Chesapeake, VA","Irving, TX","Scottsdale, AZ","North Las Vegas, NV",
  "Fremont, CA","Gilbert, AZ","San Bernardino, CA","Birmingham, AL","Boise, ID",
  "Rochester, NY","Richmond, VA","Spokane, WA","Des Moines, IA","Modesto, CA",
  "Fayetteville, NC","Tacoma, WA","Oxnard, CA","Fontana, CA","Columbus, GA",
  "Fort Wayne, IN","Moreno Valley, CA","Akron, OH","Yonkers, NY","Glendale, CA",
  "Huntington Beach, CA","Little Rock, AR","Augusta, GA","Grand Rapids, MI",
  "Salt Lake City, UT","Tallahassee, FL","Huntsville, AL","Worcester, MA",
  "Knoxville, TN","Providence, RI","Brownsville, TX","Santa Clarita, CA",
  "Garden Grove, CA","Oceanside, CA","Fort Lauderdale, FL","Rancho Cucamonga, CA",
  "Santa Rosa, CA","Eugene, OR","Chattanooga, TN","Ontario, CA","Tempe, AZ",
  "Shreveport, LA","Elk Grove, CA","Salem, OR","Cary, NC","Clarksville, TN",
  "Coeur d'Alene, ID","Bozeman, MT","Burlington, VT","Concord, NH","Manchester, NH",
  "Ann Arbor, MI","Lansing, MI","Flint, MI","Dearborn, MI","Detroit, MI",
  "Scottsbluff, NE","Sioux Falls, SD","Fargo, ND","Bismarck, ND","Billings, MT",
  "Missoula, MT","Casper, WY","Cheyenne, WY","Pueblo, CO","Fort Collins, CO",
  "Boulder, CO","Provo, UT","Ogden, UT","Laramie, WY","Flagstaff, AZ",
  "Peoria, IL","Springfield, IL","Joliet, IL","Rockford, IL","Bloomington, IL",
  "Green Bay, WI","Appleton, WI","Oshkosh, WI","Racine, WI","Kenosha, WI",
  "Dayton, OH","Canton, OH","Springfield, OH","Parma, OH","Cleveland, OH",
  "Evansville, IN","South Bend, IN","Fort Wayne, IN","Gary, IN","Terre Haute, IN",
  "Wichita, KS","Topeka, KS","Overland Park, KS","Lawrence, KS","Olathe, KS",
  "Jackson, MS","Gulfport, MS","Biloxi, MS","Hattiesburg, MS",
  "Mobile, AL","Montgomery, AL","Tuscaloosa, AL",
  "Charleston, SC","Columbia, SC","Greenville, SC",
  "Charleston, WV","Morgantown, WV","Huntington, WV",
  "Lexington, VA","Roanoke, VA","Charlottesville, VA",
  "Portland, ME","Bangor, ME","Augusta, ME",
  "Hartford, CT","New Haven, CT","Bridgeport, CT","Stamford, CT",
  "Allentown, PA","Reading, PA","Erie, PA","Lancaster, PA","Scranton, PA",
  "Trenton, NJ","Camden, NJ","Paterson, NJ","Elizabeth, NJ",
  "Syracuse, NY","Buffalo, NY","Albany, NY","Rochester, NY","Utica, NY",
  "Springfield, MA","Worcester, MA","Boston, MA","Cambridge, MA","Lowell, MA",
  "Wilmington, DE","Dover, DE","Newark, DE",
  "Frederick, MD","Annapolis, MD","Gaithersburg, MD","Rockville, MD",
  "Miami, FL","Jacksonville, FL","Tampa, FL","Orlando, FL","Hialeah, FL",
  "Gainesville, FL","Pensacola, FL","Cape Coral, FL","Fort Myers, FL","Naples, FL",
  // Canada — by province
  "Toronto, ON","Ottawa, ON","Mississauga, ON","Brampton, ON","Hamilton, ON",
  "London, ON","Markham, ON","Vaughan, ON","Kitchener, ON","Windsor, ON",
  "Burlington, ON","Oakville, ON","Barrie, ON","Kingston, ON","Sudbury, ON",
  "Oshawa, ON","Thunder Bay, ON","Sault Ste. Marie, ON","St. Catharines, ON",
  "Guelph, ON","Cambridge, ON","Whitby, ON","Ajax, ON","Pickering, ON",
  "Montreal, QC","Quebec City, QC","Laval, QC","Gatineau, QC","Longueuil, QC",
  "Sherbrooke, QC","Saguenay, QC","Levis, QC","Trois-Rivières, QC","Terrebonne, QC",
  "Vancouver, BC","Surrey, BC","Burnaby, BC","Richmond, BC","Kelowna, BC",
  "Abbotsford, BC","Coquitlam, BC","Langley, BC","Saanich, BC","Delta, BC",
  "Nanaimo, BC","Kamloops, BC","Prince George, BC","Victoria, BC",
  "Calgary, AB","Edmonton, AB","Red Deer, AB","Lethbridge, AB","St. Albert, AB",
  "Medicine Hat, AB","Grande Prairie, AB","Airdrie, AB","Spruce Grove, AB",
  "Winnipeg, MB","Brandon, MB","Steinbach, MB","Thompson, MB",
  "Saskatoon, SK","Regina, SK","Prince Albert, SK","Moose Jaw, SK",
  "Halifax, NS","Sydney, NS","Truro, NS","New Glasgow, NS","Dartmouth, NS",
  "Fredericton, NB","Moncton, NB","Saint John, NB","Miramichi, NB",
  "Charlottetown, PE","Summerside, PE",
  "St. John's, NL","Corner Brook, NL","Mount Pearl, NL",
  "Yellowknife, NT","Whitehorse, YT","Iqaluit, NU",
].sort()

// ── North American timezones ──────────────────────────────────────────────────
const TIMEZONES = [
  // USA
  { value: "America/New_York",              label: "Eastern Time — New York, Boston, Miami" },
  { value: "America/Indiana/Indianapolis",  label: "Eastern Time — Indiana" },
  { value: "America/Kentucky/Louisville",   label: "Eastern Time — Kentucky" },
  { value: "America/Detroit",               label: "Eastern Time — Michigan" },
  { value: "America/Chicago",               label: "Central Time — Chicago, Dallas, Houston" },
  { value: "America/Indiana/Knox",          label: "Central Time — Indiana (Knox)" },
  { value: "America/North_Dakota/Center",   label: "Central Time — North Dakota" },
  { value: "America/Menominee",             label: "Central Time — Upper Michigan" },
  { value: "America/Denver",               label: "Mountain Time — Denver, Salt Lake City" },
  { value: "America/Boise",                label: "Mountain Time — Idaho" },
  { value: "America/Phoenix",              label: "Mountain Time — Arizona (no DST)" },
  { value: "America/Los_Angeles",          label: "Pacific Time — Los Angeles, Seattle, Las Vegas" },
  { value: "America/Anchorage",            label: "Alaska Time — Anchorage" },
  { value: "Pacific/Honolulu",             label: "Hawaii Time — Honolulu" },
  // Canada
  { value: "America/Toronto",              label: "Eastern Time — Toronto, Ottawa (ON/QC)" },
  { value: "America/Iqaluit",              label: "Eastern Time — Nunavut" },
  { value: "America/Winnipeg",             label: "Central Time — Winnipeg (MB)" },
  { value: "America/Regina",               label: "Central Time — Saskatchewan (no DST)" },
  { value: "America/Edmonton",             label: "Mountain Time — Edmonton, Calgary (AB)" },
  { value: "America/Yellowknife",          label: "Mountain Time — Northwest Territories" },
  { value: "America/Vancouver",            label: "Pacific Time — Vancouver, Victoria (BC)" },
  { value: "America/Whitehorse",           label: "Pacific Time — Yukon" },
  { value: "America/Halifax",              label: "Atlantic Time — Halifax (NS/NB/PEI)" },
  { value: "America/Moncton",              label: "Atlantic Time — Moncton (NB)" },
  { value: "America/Glace_Bay",            label: "Atlantic Time — Cape Breton (NS)" },
  { value: "America/Goose_Bay",            label: "Atlantic Time — Labrador" },
  { value: "America/St_Johns",             label: "Newfoundland Time — St. John's" },
]

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { city: string; timezone: string; phone: string }

export function LocationForm({ city, timezone, phone }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    city,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    phone,
  })
  const [cityQuery, setCityQuery] = useState(city)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleCityInput(val: string) {
    setCityQuery(val)
    setForm((f) => ({ ...f, city: val }))
    setErrors((e) => ({ ...e, city: "" }))
    if (val.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return }
    const q = val.toLowerCase()
    const matches = CITIES.filter((c) => c.toLowerCase().startsWith(q)).slice(0, 8)
    if (matches.length === 0) {
      const contains = CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8)
      setSuggestions(contains)
    } else {
      setSuggestions(matches)
    }
    setShowDropdown(true)
  }

  function selectCity(c: string) {
    setCityQuery(c)
    setForm((f) => ({ ...f, city: c }))
    setSuggestions([])
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.city.trim()) errs.city = "City is required"
    if (!form.timezone) errs.timezone = "Timezone is required"
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setServerError("")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: form.city.trim(),
          timezone: form.timezone,
          phone: form.phone.trim() || null,
          onboarding_step: 2,
        }),
      })
      if (res.ok) { router.push("/onboarding/family") }
      else { setServerError("Something went wrong. Please try again."); setLoading(false) }
    } catch {
      setServerError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="fade-up">
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        Your Location
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
        Used for local school calendars and reminder times.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* City search */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "0.4rem" }}>
            City
          </label>
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => cityQuery.length >= 2 && suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Type your city…"
            autoComplete="off"
            style={{
              width: "100%", padding: "0.7rem 1rem", borderRadius: "12px",
              background: "rgba(10,8,20,0.6)",
              border: errors.city ? "1px solid #f87171" : "1px solid var(--border)",
              color: "var(--text)", fontSize: "0.875rem",
              fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
          {errors.city && <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.3rem" }}>{errors.city}</p>}
          {showDropdown && suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: "rgba(18,15,35,0.98)", border: "1px solid var(--border)",
              borderRadius: "12px", marginTop: "4px", overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              {suggestions.map((c) => (
                <button
                  key={c} type="button" onClick={() => selectCity(c)}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.65rem 1rem",
                    background: "none", border: "none", color: "var(--text)",
                    fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Inter',sans-serif",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timezone */}
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "0.4rem" }}>
            Timezone
          </label>
          <select
            value={form.timezone}
            onChange={(e) => { setForm((f) => ({ ...f, timezone: e.target.value })); setErrors((er) => ({ ...er, timezone: "" })) }}
            style={{
              width: "100%", padding: "0.7rem 1rem", borderRadius: "12px",
              background: "rgba(10,8,20,0.6)",
              border: errors.timezone ? "1px solid #f87171" : "1px solid var(--border)",
              color: "var(--text)", fontSize: "0.875rem",
              fontFamily: "'Inter',sans-serif", outline: "none", cursor: "pointer",
            }}
          >
            <option value="">Select timezone…</option>
            <optgroup label="── United States ──">
              {TIMEZONES.filter((_, i) => i <= 13).map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </optgroup>
            <optgroup label="── Canada ──">
              {TIMEZONES.filter((_, i) => i >= 14).map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </optgroup>
          </select>
          {errors.timezone && <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.3rem" }}>{errors.timezone}</p>}
        </div>

        {/* Phone */}
        <div>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "0.4rem" }}>
            Phone <span style={{ color: "var(--muted)", fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="e.g. +1 416 555 0100"
            style={{
              width: "100%", padding: "0.7rem 1rem", borderRadius: "12px",
              background: "rgba(10,8,20,0.6)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: "0.875rem",
              fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {serverError && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
          <button
            type="button"
            onClick={() => router.push("/onboarding/profile")}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: "10px",
              background: "none", border: "1px solid var(--border)",
              color: "var(--muted)", fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 2, padding: "0.7rem", borderRadius: "10px",
              background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg,#6366f1,#c084fc)",
              border: "none", color: "white", fontSize: "0.85rem",
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            {loading ? "Saving…" : "Continue →"}
          </button>
        </div>
      </form>
    </Card>
  )
}
