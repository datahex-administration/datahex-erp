import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import DailyTask from "@/models/DailyTask";

function getDateRange(dateValue?: string | null) {
  const baseDate = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("Invalid date");
  }

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = request.nextUrl;
  const requestedUserId = searchParams.get("userId");
  const targetUserId =
    requestedUserId && session.role !== "staff" ? requestedUserId : session.userId;

  let dateRange;
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 1, 1), 60);

  try {
    dateRange = getDateRange(searchParams.get("date"));
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const rangeStart = new Date(dateRange.end);
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const tasks = await DailyTask.find({
    companyId: session.companyId,
    userId: targetUserId,
    workDate: {
      $gte: rangeStart,
      $lte: dateRange.end,
    },
  })
    .sort({ workDate: -1, createdAt: -1 })
    .lean();

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  let workDateRange;

  try {
    workDateRange = getDateRange(body.workDate);
  } catch {
    return NextResponse.json({ error: "Invalid work date" }, { status: 400 });
  }

  const targetUserId =
    body.userId && session.role !== "staff" ? body.userId : session.userId;

  const task = await DailyTask.create({
    userId: targetUserId,
    companyId: session.companyId,
    title: body.title.trim(),
    description: body.description?.trim() || undefined,
    workDate: workDateRange.start,
    status: ["planned", "in_progress", "completed"].includes(body.status)
      ? body.status
      : "planned",
    durationHours:
      body.durationHours !== undefined && body.durationHours !== ""
        ? Number(body.durationHours)
        : undefined,
  });

  return NextResponse.json(task, { status: 201 });
}