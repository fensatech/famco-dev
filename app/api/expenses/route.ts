import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { getExpenses, createExpense } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const expenses = await getExpenses(session.profileId)
  return NextResponse.json({ expenses })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
