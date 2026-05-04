import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    footway?: string
    path?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
}

interface PhotonFeature {
  properties: {
    osm_id: number
    name?: string
    housenumber?: string
    street?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
    countrycode?: string
  }
  geometry?: { coordinates?: [number, number] }
}

interface AddressSuggestion {
  id: string
  name: string
  display: string
  street: string
  city: string
  province: string
  postal: string
  country: string
  countryCode: "CA" | "US" | ""
  lat: string | null
  lon: string | null
  source: "nominatim" | "photon"
}

type SearchMode = "address" | "school"

const COUNTRY_NAMES: Record<"CA" | "US", string> = {
  CA: "Canada",
  US: "United States",
}

function normalizeCountryHint(value: string | null): "CA" | "US" {
  if (!value) return "CA"
  const normalized = value.trim().toLowerCase()
  if (!normalized) return "CA"
  if (normalized.includes("united states") || normalized === "us" || normalized === "usa") return "US"
  return "CA"
}

function queryMentionsCountry(query: string): boolean {
  const value = ` ${query.toLowerCase()} `
  return value.includes(" canada ") || value.includes(" united states ") || value.includes(" usa ") || value.includes(" us ")
}

function normalizePostal(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase()
}

function parseNominatim(result: NominatimResult): AddressSuggestion {
  const address = result.address ?? {}
  const street = [address.house_number, address.road ?? address.pedestrian ?? address.footway ?? address.path].filter(Boolean).join(" ")
  const name = result.display_name.split(",")[0]?.trim() || street || result.display_name
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county ?? ""
  const province = address.state ?? ""
  const postal = address.postcode ?? ""
  const countryCode = (address.country_code?.toUpperCase() ?? "") as "CA" | "US" | ""
  const country = address.country ?? (countryCode ? COUNTRY_NAMES[countryCode] : "")
  const display = [name, street, city, province, postal, country].filter(Boolean).join(", ")
  return {
    id: `nominatim-${result.place_id}`,
    name,
    display,
    street: street || "",
    city,
    province,
    postal,
    country,
    countryCode,
    lat: result.lat ?? null,
    lon: result.lon ?? null,
    source: "nominatim",
  }
}

function parsePhoton(feature: PhotonFeature): AddressSuggestion {
  const properties = feature.properties
  const street = [properties.housenumber, properties.street].filter(Boolean).join(" ")
  const name = properties.name?.trim() || street || ""
  const city = properties.city ?? properties.town ?? properties.village ?? ""
  const province = properties.state ?? ""
  const postal = properties.postcode ?? ""
  const countryCode = (properties.countrycode?.toUpperCase() ?? "") as "CA" | "US" | ""
  const country = properties.country ?? (countryCode ? COUNTRY_NAMES[countryCode] : "")
  const display = [name, street, city, province, postal, country].filter(Boolean).join(", ")
  return {
    id: `photon-${properties.osm_id}`,
    name,
    display,
    street: street || "",
    city,
    province,
    postal,
    country,
    countryCode,
    lat: feature.geometry?.coordinates ? String(feature.geometry.coordinates[1]) : null,
    lon: feature.geometry?.coordinates ? String(feature.geometry.coordinates[0]) : null,
    source: "photon",
  }
}

function scoreSuggestion(suggestion: AddressSuggestion, query: string, countryHint: "CA" | "US", mode: SearchMode) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryNoPunctuation = normalizedQuery.replace(/[,.-]/g, " ")
  const queryTokens = queryNoPunctuation.split(/\s+/).filter(Boolean)
  const display = suggestion.display.toLowerCase()
  const name = suggestion.name.toLowerCase()
  const street = suggestion.street.toLowerCase()
  const city = suggestion.city.toLowerCase()
  const postal = normalizePostal(suggestion.postal)

  let score = 0
  if (suggestion.countryCode === countryHint) score += 30
  if (suggestion.source === "nominatim") score += 8
  if (suggestion.street && /\d/.test(suggestion.street)) score += 18
  if (suggestion.postal) score += 10
  if (street && display.startsWith(street)) score += 8
  if (city && normalizedQuery.includes(city)) score += 6
  if (street && normalizedQuery.includes(street)) score += 15
  if (postal && normalizePostal(query).includes(postal)) score += 15
  if (/^[a-z]\d[a-z]\s?\d[a-z]\d$/i.test(query.trim()) && postal === normalizePostal(query)) score += 25

  if (mode === "school") {
    if (/\b(school|academy|college|campus|nursery|preschool|kindergarten)\b/.test(name)) score += 24
    if (name && normalizedQuery.includes(name)) score += 20
    if (name && queryTokens.some((token) => name.includes(token))) score += 8
  }

  for (const token of queryTokens) {
    if (display.includes(token)) score += 2
  }

  if (countryHint === "CA" && suggestion.countryCode === "CA" && /\b(ab|bc|mb|nb|nl|ns|nt|nu|on|pe|qc|sk|yt)\b/i.test(query)) {
    score += 8
  }

  return score
}

function dedupeSuggestions(suggestions: AddressSuggestion[]) {
  const seen = new Set<string>()
  const unique: AddressSuggestion[] = []
  for (const suggestion of suggestions) {
    const key = `${suggestion.display}|${suggestion.countryCode}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(suggestion)
  }
  return unique
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  })
  if (!response.ok) throw new Error(`Lookup failed with ${response.status}`)
  return response.json() as Promise<T>
}

async function searchNominatim(query: string, countryCode: "CA" | "US") {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "8",
    countrycodes: countryCode.toLowerCase(),
    q: query,
  })
  const results = await fetchJson<NominatimResult[]>(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "Famco/11 address search",
      },
    },
  )
  return results.map(parseNominatim)
}

async function searchPhoton(query: string, countryCode: "CA" | "US") {
  const bbox = countryCode === "CA" ? "-141.0,41.0,-52.0,84.0" : "-125.0,24.0,-66.0,49.8"
  const params = new URLSearchParams({
    q: query,
    limit: "8",
    lang: "en",
    bbox,
  })
  const data = await fetchJson<{ features: PhotonFeature[] }>(
    `https://photon.komoot.io/api/?${params.toString()}`
  )
  return data.features
    .map(parsePhoton)
    .filter((feature) => feature.countryCode === countryCode)
}

async function lookupAddressSuggestions(query: string, countryHint: "CA" | "US", mode: SearchMode) {
  const alternateCountry = countryHint === "CA" ? "US" : "CA"
  const hasCountryInQuery = queryMentionsCountry(query)
  const schoolQuery = mode === "school" && !/\bschool|academy|college|campus|nursery|preschool|kindergarten\b/i.test(query)
    ? `${query} school`
    : query
  const preferredQuery = hasCountryInQuery ? schoolQuery : `${schoolQuery}, ${COUNTRY_NAMES[countryHint]}`

  const candidateBatches = await Promise.allSettled([
    searchNominatim(preferredQuery, countryHint),
    searchPhoton(preferredQuery, countryHint),
    searchNominatim(query, countryHint),
    hasCountryInQuery ? Promise.resolve([] as AddressSuggestion[]) : searchPhoton(query, countryHint),
    hasCountryInQuery ? Promise.resolve([] as AddressSuggestion[]) : searchNominatim(query, alternateCountry),
  ])

  const suggestions = candidateBatches.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  const unique = dedupeSuggestions(suggestions)
  return unique
    .map((suggestion) => ({ suggestion, score: scoreSuggestion(suggestion, query, countryHint, mode) }))
    .sort((a, b) => b.score - a.score || a.suggestion.display.localeCompare(b.suggestion.display))
    .slice(0, 8)
    .map(({ suggestion }) => suggestion)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const countryHint = normalizeCountryHint(req.nextUrl.searchParams.get("country"))
  const mode = req.nextUrl.searchParams.get("mode") === "school" ? "school" : "address"

  if (query.length < 3) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await lookupAddressSuggestions(query, countryHint, mode)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
