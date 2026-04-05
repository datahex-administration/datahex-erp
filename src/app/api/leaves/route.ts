import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Leave from "@/models/Leave";
import LeaveBalance from "@/models/LeaveBalance";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employeeId");
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (status) filter.status = status;
  if (employeeId) filter.employeeId = employeeId;
  if (search) {
    filter.reason = { $regex: search, $options: "i" };
  }

  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate("employeeId", "name employeeId")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Leave.countDocuments(filter),
  ]);

  return NextResponse.json({ data: leaves, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { employeeId, type, startDate, endDate, reason } = body;

  if (!employeeId || !type || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (days < 1) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }

  // Check leave balance (skip for unpaid)
  if (type !== "unpaid") {
    const year = start.getFullYear();
    const balance = await LeaveBalance.findOne({ employeeId, year });
    if (balance) {
      const typeBalance = balance.balances[type as keyof typeof balance.balances];
      if (typeBalance && typeBalance.remaining < days) {
        return NextResponse.json(
          { error: `Insufficient ${type} leave balance. Remaining: ${typeBalance.remaining}` },
          { status: 400 }
        );
      }
    }
  }

  const leave = await Leave.create({
    employeeId,
    companyId: session.companyId,
    type,
    startDate: start,
    endDate: end,
    days,
    reason,
  });

  return NextResponse.json(leave, { status: 201 });
}
