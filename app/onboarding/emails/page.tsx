import { redirect } from "next/navigation"

// Email scan step removed from onboarding — scan runs automatically in background.
export default function EmailsPage() {
  redirect("/onboarding/location")
}
