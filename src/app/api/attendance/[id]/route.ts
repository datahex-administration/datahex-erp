import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const record = await Attendance.findById(id);
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  // Only the record owner can clock out (or super_admin/manager)
  if (
    record.userId.toString() !== session.userId &&
    (session.role === "staff" || session.role === "customer_success")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (record.status === "completed") {
    return NextResponse.json(
      { error: "Already clocked out" },
      { status: 400 }
    );
  }

  const now = new Date();
  const diffMs = now.getTime() - record.clockInTime.getTime();
  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

  record.clockOutTime = now;
  record.totalHours = totalHours;
  record.status = "completed";

  const body = await request.json().catch(() => ({}));
  if (body.notes?.trim()) {
    record.notes = body.notes.trim();
  }

  await record.save();

  return NextResponse.json(record);
}
