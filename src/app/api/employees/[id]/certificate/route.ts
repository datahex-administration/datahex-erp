import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import Company from "@/models/Company";
import { generateCertificateHTML } from "@/lib/certificate-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const employee = await Employee.findById(id).lean();
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emp = employee as any;

  // Fetch the company details
  const company = await Company.findById(emp.companyId).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (company || {}) as any;

  const html = generateCertificateHTML({
    company: {
      name: comp.name,
      logo: comp.logo,
      address: comp.address,
      billingAddress: comp.billingAddress,
    },
    employee: {
      name: emp.name,
      employeeId: emp.employeeId,
      designation: emp.designation,
      department: emp.department,
      type: emp.type,
      joiningDate: emp.joiningDate,
      endDate: emp.endDate,
      status: emp.status,
    },
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
