import { google } from "googleapis"
import type { ScannedMeeting } from "@/types"

const MEETING_KEYWORDS = [
  "meeting", "appointment", "schedule", "calendar invite",
  "school", "pickup", "drop-off", "parent-teacher", "conference",
  "dentist", "doctor", "practice", "game", "recital",
]

export async function scanEmailsForMeetings(
  accessToken: string
): Promise<ScannedMeeting[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: "v1", auth })

  const query =
    MEETING_KEYWORDS.map((k) => `"${k}"`).join(" OR ") + " newer_than:60d"

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
  })

  const messages = list.data.messages ?? []
  const results: ScannedMeeting[] = []

  for (const msg of messages.slice(0, 25)) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["Subject", "Date"],
    })
    const headers = detail.data.payload?.headers ?? []
    results.push({
      subject: headers.find((h) => h.name === "Subject")?.value ?? "(no subject)",
      date: headers.find((h) => h.name === "Date")?.value ?? "",
      snippet: detail.data.snippet ?? "",
    })
  }

  return results
}
