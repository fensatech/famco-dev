import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/db"
import { EmailsForm } from "./EmailsForm"

export default async function EmailsPage() {
  const session = await auth()
  if (!session?.profileId) redirect("/")
  const profile = await getProfile(session.profileId)
  if (profile?.onboarding_completed) redirect("/dashboard")
  if ((profile?.onboarding_step ?? 0) < 1) redirect("/onboarding/profile")
  return <EmailsForm provider={session.provider ?? ""} />
}
