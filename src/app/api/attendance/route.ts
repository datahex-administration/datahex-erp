import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = request.nextUrl;
  const requestedUserId = searchParams.get("userId");
  const workMode = searchParams.get("workMode");
  const status = searchParams.get("status");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 31, 1), 100);

  // Staff/customer_success can only see own records
  const targetUserId =
    requestedUserId && session.role !== "staff" && session.role !== "customer_success" ? requestedUserId : session.userId;

  const query: Record<string, unknown> = {
    companyId: session.companyId,
    userId: targetUserId,
  };

  // Date range from month/year or default to current month
  const now = new Date();
  const targetYear = Number(year) || now.getFullYear();
  const targetMonth = month ? Number(month) - 1 : now.getMonth();
  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  query.date = { $gte: startDate, $lte: endDate };

  if (workMode && ["office", "wfh"].includes(workMode)) {
    query.workMode = workMode;
  }
  if (status && ["clocked_in", "completed"].includes(status)) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(query),
  ]);

  return NextResponse.json({
    data: records,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await request.json();

  if (!body.workMode || !["office", "wfh"].includes(body.workMode)) {
    return NextResponse.json(
      { error: "Work mode is required (office or wfh)" },
      { status: 400 }
    );
  }

  // Normalize today to midnight for the date field
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check for duplicate — one record per employee per day
  const existing = await Attendance.findOne({
    companyId: session.companyId,
    userId: session.userId,
    date: todayStart,
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already clocked in for today" },
      { status: 400 }
    );
  }

  const record = await Attendance.create({
    userId: session.userId,
    companyId: session.companyId,
    date: todayStart,
    clockInTime: now,
    workMode: body.workMode,
    notes: body.notes?.trim() || undefined,
    status: "clocked_in",
  });

  return NextResponse.json(record, { status: 201 });
}
