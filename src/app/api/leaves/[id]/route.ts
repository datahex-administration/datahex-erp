import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Leave from "@/models/Leave";
import LeaveBalance from "@/models/LeaveBalance";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await request.json();
  const { status } = body;

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const leave = await Leave.findById(id);
  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (leave.status !== "pending") {
    return NextResponse.json({ error: "Leave already processed" }, { status: 400 });
  }

  leave.status = status;
  leave.approvedBy = session.userId;
  leave.approvedAt = new Date();
  await leave.save();

  // Update leave balance if approved (skip for unpaid)
  if (status === "approved" && leave.type !== "unpaid") {
    const year = leave.startDate.getFullYear();
    let balance = await LeaveBalance.findOne({
      employeeId: leave.employeeId,
      year,
    });

    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: leave.employeeId,
        companyId: leave.companyId,
        year,
      });
    }

    const leaveType = leave.type as "sick" | "casual" | "earned";
    balance.balances[leaveType].used += leave.days;
    balance.balances[leaveType].remaining =
      balance.balances[leaveType].total - balance.balances[leaveType].used;
    await balance.save();
  }

  await logAudit({
    companyId: leave.companyId.toString(),
    userId: session.userId,
    action: status === "approved" ? "approve" : "reject",
    module: "leaves",
    details: `${status} ${leave.type} leave (${leave.days} days) for employee ${leave.employeeId}`,
  });

  return NextResponse.json(leave);
}
