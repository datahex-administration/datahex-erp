import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SalaryProcessing from "@/models/SalaryProcessing";
import Employee from "@/models/Employee";
import Expense from "@/models/Expense";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (year) filter.year = Number(year);
  if (month) filter.month = Number(month);

  const [processings, total] = await Promise.all([
    SalaryProcessing.find(filter)
      .populate("processedBy", "name")
      .sort({ year: -1, month: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    SalaryProcessing.countDocuments(filter),
  ]);

  return NextResponse.json({ data: processings, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { month, year, companyId: bodyCompanyId, adjustments, paymentType = "full", partialAmounts } = body;

  if (!month || !year) {
    return NextResponse.json({ error: "Month and year are required" }, { status: 400 });
  }

  const targetCompanyId =
    session.role === "super_admin" && bodyCompanyId
      ? bodyCompanyId
      : session.companyId;

  // Check if already processed
  const existing = await SalaryProcessing.findOne({
    companyId: targetCompanyId,
    month: Number(month),
    year: Number(year),
  });
  if (existing) {
    return NextResponse.json({ error: "Salary already processed for this month" }, { status: 409 });
  }

  // Get active employees
  const employees = await Employee.find({
    companyId: targetCompanyId,
    status: "active",
  }).lean();

  if (employees.length === 0) {
    return NextResponse.json({ error: "No active employees found" }, { status: 400 });
  }

  // Build salary entries
  const adj = adjustments || {};
  const partial = partialAmounts || {};
  const salaryEntries = employees.map((emp) => {
    const empAdj = adj[emp._id.toString()] || {};
    const deductions = Number(empAdj.deductions) || 0;
    const bonus = Number(empAdj.bonus) || 0;
    const netSalary = emp.salary - deductions + bonus;

    let paidAmount = netSalary;
    let status: "pending" | "paid" | "partially_paid" = "paid";

    if (paymentType === "partial") {
      const customAmount = partial[emp._id.toString()];
      if (customAmount !== undefined && customAmount !== null) {
        paidAmount = Math.min(Number(customAmount), netSalary);
      }
      status = paidAmount >= netSalary ? "paid" : "partially_paid";
    }

    return {
      employeeId: emp._id,
      employeeName: emp.name,
      baseSalary: emp.salary,
      deductions,
      bonus,
      netSalary,
      paidAmount,
      remainingAmount: netSalary - paidAmount,
      status,
    };
  });

  const totalAmount = salaryEntries.reduce((sum, e) => sum + e.netSalary, 0);
  const totalPaid = salaryEntries.reduce((sum, e) => sum + e.paidAmount, 0);

  const processing = await SalaryProcessing.create({
    companyId: targetCompanyId,
    month: Number(month),
    year: Number(year),
    paymentType,
    employees: salaryEntries,
    totalAmount,
    totalPaid,
    currency: employees[0]?.currency || "INR",
    processedBy: session.userId,
  });

  // Auto-create expense entry
  await Expense.create({
    companyId: targetCompanyId,
    category: "Salary",
    description: `Salary ${paymentType === "partial" ? "(Partial)" : ""} for ${month}/${year}`,
    amount: totalPaid,
    currency: employees[0]?.currency || "INR",
    date: new Date(Number(year), Number(month) - 1, 28),
    type: "salary",
    status: "approved",
    approvedBy: session.userId,
  });

  return NextResponse.json(processing, { status: 201 });
}
