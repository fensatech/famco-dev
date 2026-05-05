import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { createExpense, getExpenses, getHouseholdRole } from "@/lib/db"
import { canManageExpenses } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const expenses = await getExpenses(session.profileId)
  return NextResponse.json({ expenses })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = await getHouseholdRole(session.profileId)
  if (!canManageExpenses(role)) {
    return NextResponse.json({ error: "You have read-only access for household expenses." }, { status: 403 })
  }
  const body = await req.json()
  const { title, amount, category, expense_date, notes } = body
  if (!title?.trim() || !amount || !expense_date) {
    return NextResponse.json({ error: "title, amount, expense_date required" }, { status: 400 })
  }
  const expense = await createExpense(session.profileId, {
    title: title.trim(), amount: Number(amount), category: category ?? null,
    expense_date, notes: notes ?? null,
  })
  return NextResponse.json({ expense }, { status: 201 })
}
