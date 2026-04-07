import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Attendance from "@/models/Attendance";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers and super_admin can view team summary
  if (session.role === "staff" || session.role === "customer_success") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = request.nextUrl;
  const now = new Date();
  const targetYear = Number(searchParams.get("year")) || now.getFullYear();
  const targetMonth = searchParams.get("month")
    ? Number(searchParams.get("month")) - 1
    : now.getMonth();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  // Get all attendance records for this month in the company
  const records = await Attendance.find({
    companyId: session.companyId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  // Get team users
  const users = await User.find({
    companyId: session.companyId,
    isActive: true,
  })
    .select("name email role")
    .lean();

  // Build per-employee summary
  const summary = users.map((u) => {
    const userRecords = records.filter(
      (r) => r.userId.toString() === u._id.toString()
    );
    const completedRecords = userRecords.filter((r) => r.status === "completed");

    return {
      userId: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      totalDays: userRecords.length,
      totalHours: completedRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0),
      officeDays: userRecords.filter((r) => r.workMode === "office").length,
      wfhDays: userRecords.filter((r) => r.workMode === "wfh").length,
      todayStatus: userRecords.find(
        (r) =>
          r.date.toDateString() === now.toDateString()
      ),
    };
  });

  return NextResponse.json({
    month: targetMonth + 1,
    year: targetYear,
    summary,
  });
}
