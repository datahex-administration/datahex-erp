import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const employee = await Employee.findById(id)
    .populate("companyId", "name code currency")
    .lean();

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await request.json();
  const employee = await Employee.findByIdAndUpdate(id, body, { new: true });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    companyId: employee.companyId.toString(),
    userId: session.userId,
    action: "update",
    module: "employees",
    details: `Updated employee ${employee.name} (${employee.employeeId})`,
  });

  return NextResponse.json(employee);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const employee = await Employee.findByIdAndUpdate(
    id,
    { status: "terminated" },
    { new: true }
  );
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    companyId: employee.companyId.toString(),
    userId: session.userId,
    action: "delete",
    module: "employees",
    details: `Terminated employee ${employee.name} (${employee.employeeId})`,
  });

  return NextResponse.json({ success: true });
}
