import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import DailyTask from "@/models/DailyTask";

export const dynamic = "force-dynamic";

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
  const allUsers = searchParams.get("allUsers") === "true";
  const isAdmin = session.role === "super_admin" || session.role === "manager";

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

  // Build filter
  const filter: Record<string, unknown> = {
    companyId: session.companyId,
    workDate: { $gte: rangeStart, $lte: dateRange.end },
  };

  // If allUsers mode requested by admin, don't filter by userId
  // If a specific userId is requested by admin, filter by that user
  // Otherwise filter by the logged-in user's own tasks
  if (allUsers && isAdmin) {
    // no userId filter — fetch all users' tasks
  } else if (requestedUserId && isAdmin) {
    filter.userId = requestedUserId;
  } else {
    filter.userId = session.userId;
  }

  const query = DailyTask.find(filter)
    .populate("projectId", "name")
    .sort({ workDate: -1, createdAt: -1 });

  // Populate user details when viewing all users or another user's tasks
  if (isAdmin && (allUsers || (requestedUserId && requestedUserId !== session.userId))) {
    query.populate("userId", "name email role");
  }

  const tasks = await query.lean();

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
    projectId: body.projectId || undefined,
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

  // Re-fetch with populated projectId
  const populated = await DailyTask.findById(task._id).populate("projectId", "name").lean();
  return NextResponse.json(populated, { status: 201 });
}