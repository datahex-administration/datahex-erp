import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SalaryIncrement from "@/models/SalaryIncrement";
import Employee from "@/models/Employee";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");

  const filter: Record<string, unknown> = employeeId
    ? { employeeId }
    : session.role === "super_admin"
      ? {}
      : { companyId: session.companyId };

  const increments = await SalaryIncrement.find(filter)
    .populate("employeeId", "name employeeId")
    .sort({ effectiveDate: -1 })
    .lean();

  return NextResponse.json(increments);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { employeeId, newSalary, effectiveDate, reason } = body;

  if (!employeeId || !newSalary || !effectiveDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const increment = await SalaryIncrement.create({
    employeeId,
    companyId: employee.companyId,
    previousSalary: employee.salary,
    newSalary: Number(newSalary),
    effectiveDate: new Date(effectiveDate),
    reason,
    approvedBy: session.userId,
  });

  // Update employee salary
  employee.salary = Number(newSalary);
  await employee.save();

  return NextResponse.json(increment, { status: 201 });
}
