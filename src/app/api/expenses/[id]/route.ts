import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const expense = await Expense.findById(id)
    .populate("approvedBy", "name email")
    .populate("projectId", "name")
    .lean();

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(expense);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await request.json();
  if (body.date) body.date = new Date(body.date);

  // If approving, record the approver
  if (body.status === "approved" && !body.approvedBy) {
    body.approvedBy = session.userId;
  }

  const expense = await Expense.findByIdAndUpdate(id, body, { new: true })
    .populate("approvedBy", "name email")
    .populate("projectId", "name");

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    await logAudit({
      companyId: expense.companyId.toString(),
      userId: session.userId,
      action: body.status === "approved" ? "approve" : body.status === "rejected" ? "reject" : "update",
      module: "expenses",
      details: `Expense "${expense.description}" ${body.status} — ${expense.currency} ${expense.amount}`,
    });
  }

  return NextResponse.json(expense);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Expense.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
