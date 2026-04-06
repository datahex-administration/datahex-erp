import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const record = await Attendance.findOne({
    companyId: session.companyId,
    userId: session.userId,
    date: todayStart,
  }).lean();

  return NextResponse.json(record || null);
}
