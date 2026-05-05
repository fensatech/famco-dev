"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"

const CITIES = [
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
  "Toronto, ON","Ottawa, ON","Mississauga, ON","Brampton, ON","Hamilton, ON",
  "London, ON","Markham, ON","Vaughan, ON","Kitchener, ON","Windsor, ON",
  "Burlington, ON","Oakville, ON","Barrie, ON","Kingston, ON","Sudbury, ON",
  "Oshawa, ON","Thunder Bay, ON","Sault Ste. Marie, ON","St. Catharines, ON",
  "Guelph, ON","Cambridge, ON","Whitby, ON","Ajax, ON","Pickering, ON",
  "Montreal, QC","Quebec City, QC","Laval, QC","Gatineau, QC","Longueuil, QC",
  "Sherbrooke, QC","Saguenay, QC","Levis, QC","Trois-Rivieres, QC","Terrebonne, QC",
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

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time - New York, Boston, Miami" },
  { value: "America/Indiana/Indianapolis", label: "Eastern Time - Indiana" },
  { value: "America/Kentucky/Louisville", label: "Eastern Time - Kentucky" },
  { value: "America/Detroit", label: "Eastern Time - Michigan" },
  { value: "America/Chicago", label: "Central Time - Chicago, Dallas, Houston" },
  { value: "America/Indiana/Knox", label: "Central Time - Indiana (Knox)" },
  { value: "America/North_Dakota/Center", label: "Central Time - North Dakota" },
  { value: "America/Menominee", label: "Central Time - Upper Michigan" },
  { value: "America/Denver", label: "Mountain Time - Denver, Salt Lake City" },
  { value: "America/Boise", label: "Mountain Time - Idaho" },
  { value: "America/Phoenix", label: "Mountain Time - Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time - Los Angeles, Seattle, Las Vegas" },
  { value: "America/Anchorage", label: "Alaska Time - Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii Time - Honolulu" },
  { value: "America/Toronto", label: "Eastern Time - Toronto, Ottawa (ON/QC)" },
  { value: "America/Iqaluit", label: "Eastern Time - Nunavut" },
  { value: "America/Winnipeg", label: "Central Time - Winnipeg (MB)" },
  { value: "America/Regina", label: "Central Time - Saskatchewan (no DST)" },
  { value: "America/Edmonton", label: "Mountain Time - Edmonton, Calgary (AB)" },
  { value: "America/Yellowknife", label: "Mountain Time - Northwest Territories" },
  { value: "America/Vancouver", label: "Pacific Time - Vancouver, Victoria (BC)" },
  { value: "America/Whitehorse", label: "Pacific Time - Yukon" },
  { value: "America/Halifax", label: "Atlantic Time - Halifax (NS/NB/PEI)" },
  { value: "America/Moncton", label: "Atlantic Time - Moncton (NB)" },
  { value: "America/Glace_Bay", label: "Atlantic Time - Cape Breton (NS)" },
  { value: "America/Goose_Bay", label: "Atlantic Time - Labrador" },
  { value: "America/St_Johns", label: "Newfoundland Time - St. John's" },
]

const DEFAULT_CITY_SUGGESTIONS = [
  "Toronto, ON",
  "Vancouver, BC",
  "Calgary, AB",
  "Edmonton, AB",
  "Montreal, QC",
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Seattle, WA",
  "Dallas, TX",
]

interface Props {
  city: string
  timezone: string
  phone: string
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.11em",
  color: "#71717a",
  marginBottom: "0.45rem",
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.9rem 1rem",
  borderRadius: "16px",
  background: "#fcfcff",
  border: "1px solid rgba(99,102,241,0.14)",
  color: "var(--text)",
  fontSize: "0.92rem",
  fontFamily: "'Inter',sans-serif",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 2px rgba(15,23,42,0.04)",
}

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.45rem",
  minWidth: "120px",
  padding: "0.82rem 1.05rem",
  borderRadius: "16px",
  border: "1px solid rgba(99,102,241,0.18)",
  background: "rgba(255,255,255,0.94)",
  color: "#4f46e5",
  fontSize: "0.84rem",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
  boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
}

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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleCityInput(value: string) {
    setCityQuery(value)
    setForm((current) => ({ ...current, city: value }))
    setErrors((current) => ({ ...current, city: "" }))
    if (value.trim().length === 0) {
      setSuggestions(DEFAULT_CITY_SUGGESTIONS)
      setShowDropdown(true)
      return
    }

    if (value.trim().length < 2) {
      setSuggestions(DEFAULT_CITY_SUGGESTIONS.filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 8))
      setShowDropdown(true)
      return
    }

    const query = value.toLowerCase()
    const startsWith = CITIES.filter((item) => item.toLowerCase().startsWith(query)).slice(0, 8)
    const matches = startsWith.length > 0
      ? startsWith
      : CITIES.filter((item) => item.toLowerCase().includes(query)).slice(0, 8)
    setSuggestions(matches)
    setShowDropdown(true)
  }

  function selectCity(value: string) {
    setCityQuery(value)
    setForm((current) => ({ ...current, city: value }))
    setSuggestions([])
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.city.trim()) nextErrors.city = "City is required"
    if (!form.timezone) nextErrors.timezone = "Timezone is required"
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

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
      if (res.ok) {
        router.push("/onboarding/family")
      } else {
        setServerError("Something went wrong. Please try again.")
        setLoading(false)
      }
    } catch {
      setServerError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Card className="fade-up">
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          borderRadius: "999px",
          padding: "0.3rem 0.65rem",
          background: "rgba(56,189,248,0.1)",
          color: "#0369a1",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "0.9rem",
        }}
      >
        Location
      </div>

      <h2 style={{ fontSize: "clamp(1.65rem, 3vw, 2.05rem)", fontWeight: 800, marginBottom: "0.45rem" }}>
        Keep your family timing local
      </h2>
      <p style={{ color: "#5b6475", fontSize: "0.92rem", marginBottom: "1.65rem", lineHeight: 1.7, maxWidth: "46ch" }}>
        This helps Famco place reminders, school timing, and appointment suggestions in the right place from the start.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <label style={labelStyle}>City</label>
          <div style={{ fontSize: "0.74rem", color: "var(--muted)", marginBottom: "0.45rem" }}>
            Search and pick from Canada and United States cities for now.
          </div>
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => handleCityInput(e.target.value)}
            onFocus={() => {
              if (cityQuery.trim().length >= 2 && suggestions.length > 0) {
                setShowDropdown(true)
                return
              }
              if (cityQuery.trim().length === 0) {
                setSuggestions(DEFAULT_CITY_SUGGESTIONS)
                setShowDropdown(true)
              }
            }}
            placeholder="Search a city in Canada or the U.S."
            autoComplete="off"
            style={{
              ...fieldStyle,
              border: errors.city ? "1px solid #f87171" : fieldStyle.border,
            }}
          />
          {errors.city && <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.3rem" }}>{errors.city}</p>}
          {showDropdown && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(99,102,241,0.12)",
                borderRadius: "16px",
                marginTop: "6px",
                overflow: "hidden",
                boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
              }}
            >
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectCity(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    background: "none",
                    border: "none",
                    color: "var(--text)",
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    fontFamily: "'Inter',sans-serif",
                    borderBottom: "1px solid rgba(99,102,241,0.08)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => {
              setForm((current) => ({ ...current, timezone: e.target.value }))
              setErrors((current) => ({ ...current, timezone: "" }))
            }}
            style={{
              ...fieldStyle,
              border: errors.timezone ? "1px solid #f87171" : fieldStyle.border,
              cursor: "pointer",
            }}
          >
            <option value="">Select timezone</option>
            <optgroup label="United States">
              {TIMEZONES.filter((_, index) => index <= 13).map((timezoneOption) => (
                <option key={timezoneOption.value} value={timezoneOption.value}>{timezoneOption.label}</option>
              ))}
            </optgroup>
            <optgroup label="Canada">
              {TIMEZONES.filter((_, index) => index >= 14).map((timezoneOption) => (
                <option key={timezoneOption.value} value={timezoneOption.value}>{timezoneOption.label}</option>
              ))}
            </optgroup>
          </select>
          {errors.timezone && <p style={{ fontSize: "0.72rem", color: "#f87171", marginTop: "0.3rem" }}>{errors.timezone}</p>}
        </div>

        <div>
          <label style={labelStyle}>
            Phone <span style={{ color: "var(--muted)", fontWeight: 500, textTransform: "none", letterSpacing: "normal" }}>(optional)</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            placeholder="e.g. +1 416 555 0100"
            style={fieldStyle}
          />
        </div>

        {serverError && <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{serverError}</p>}

        <div
          style={{
            marginTop: "0.35rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <button type="button" onClick={() => router.push("/onboarding/profile")} style={secondaryButtonStyle}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
              Used for reminders and local household timing.
            </div>
            <Button type="submit" loading={loading}>
              {loading ? "Saving..." : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
