import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import DailyTask from "@/models/DailyTask";

export const dynamic = "force-dynamic";

function canAccessTask(
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  task: { companyId: { toString(): string }; userId: { toString(): string } }
) {
  if (session.role === "super_admin" || session.role === "manager") {
    return task.companyId.toString() === session.companyId;
  }

  return task.userId.toString() === session.userId;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const task = await DailyTask.findById(id);
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canAccessTask(session, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  if (body.title !== undefined) {
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    task.title = body.title.trim();
  }

  if (body.description !== undefined) {
    task.description = body.description?.trim() || undefined;
  }

  if (body.status !== undefined) {
    if (!["planned", "in_progress", "completed"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid task status" }, { status: 400 });
    }

    task.status = body.status;
  }

  if (body.durationHours !== undefined) {
    const durationHours = Number(body.durationHours);

    if (Number.isNaN(durationHours) || durationHours < 0) {
      return NextResponse.json({ error: "Duration must be zero or greater" }, { status: 400 });
    }

    task.durationHours = durationHours;
  }

  await task.save();
  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const task = await DailyTask.findById(id);
  if (!task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canAccessTask(session, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await DailyTask.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}