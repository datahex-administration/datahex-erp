import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SalaryProcessing from "@/models/SalaryProcessing";
import Employee from "@/models/Employee";
import Company from "@/models/Company";
import { generateSalarySlipHTML } from "@/lib/salary-slip-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId query param required" }, { status: 400 });
  }

  await connectDB();

  const processing = await SalaryProcessing.findById(id).lean();
  if (!processing) {
    return NextResponse.json({ error: "Salary record not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc = processing as any;

  // Find the employee entry in this processing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const empEntry = proc.employees.find((e: any) => String(e.employeeId) === employeeId);
  if (!empEntry) {
    return NextResponse.json({ error: "Employee not found in this salary record" }, { status: 404 });
  }

  // Fetch employee details for designation/department
  const employee = await Employee.findById(employeeId).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emp = (employee || {}) as any;

  // Fetch company details
  const company = await Company.findById(proc.companyId).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (company || {}) as any;

  const html = generateSalarySlipHTML({
    company: {
      name: comp.name,
      logo: comp.logo,
      address: comp.address,
      billingAddress: comp.billingAddress,
    },
    employee: {
      employeeName: empEntry.employeeName,
      employeeId: emp.employeeId || "",
      designation: emp.designation,
      department: emp.department,
    },
    month: proc.month,
    year: proc.year,
    baseSalary: empEntry.baseSalary,
    deductions: empEntry.deductions,
    bonus: empEntry.bonus,
    netSalary: empEntry.netSalary,
    paidAmount: empEntry.paidAmount ?? empEntry.netSalary,
    remainingAmount: empEntry.remainingAmount ?? 0,
    status: empEntry.status,
    currency: proc.currency,
    processedAt: proc.processedAt,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
