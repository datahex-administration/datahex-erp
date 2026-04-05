import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Expense from "@/models/Expense";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const month = searchParams.get("month"); // YYYY-MM
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (type) filter.type = type;
  if (status) filter.status = status;
  if (projectId) filter.projectId = projectId;
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }
  if (month) {
    const [y, m] = month.split("-").map(Number);
    filter.date = {
      $gte: new Date(y, m - 1, 1),
      $lt: new Date(y, m, 1),
    };
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("approvedBy", "name email")
      .populate("projectId", "name")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return NextResponse.json({ data: expenses, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();

  const { category, description, amount, currency, date, projectId, type, recurring } = body;

  if (!category?.trim() || !description?.trim() || !amount || !date) {
    return NextResponse.json(
      { error: "Category, description, amount, and date are required" },
      { status: 400 }
    );
  }

  const expense = await Expense.create({
    companyId: session.companyId,
    category: category.trim(),
    description: description.trim(),
    amount: Number(amount),
    currency: currency || "INR",
    date: new Date(date),
    projectId: projectId || undefined,
    type: type || "general",
    recurring: recurring?.isRecurring ? recurring : undefined,
    status: session.role === "super_admin" || session.role === "manager" ? "approved" : "pending",
    approvedBy: session.role === "super_admin" || session.role === "manager" ? session.userId : undefined,
  });

  return NextResponse.json(expense, { status: 201 });
}
