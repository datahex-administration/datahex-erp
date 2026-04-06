import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import Company from "@/models/Company";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function generateEmployeeId(companyId: string): Promise<string> {
  const company = await Company.findById(companyId).lean();
  const code = company?.code || "EMP";
  const count = await Employee.countDocuments({ companyId });
  return `${code}-${String(count + 1).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const companyId = searchParams.get("companyId");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin"
      ? companyId
        ? { companyId }
        : {}
      : { companyId: session.companyId };

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate("companyId", "name code")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Employee.countDocuments(filter),
  ]);

  return NextResponse.json({ data: employees, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const {
    name, email, phone, designation, type, department,
    joiningDate, salary, currency, companyId: bodyCompanyId,
    endDate, bankDetails,
  } = body;

  if (!name?.trim() || !email?.trim() || !designation?.trim() || !joiningDate) {
    return NextResponse.json(
      { error: "Name, email, designation, and joining date are required" },
      { status: 400 }
    );
  }

  const targetCompanyId =
    session.role === "super_admin" && bodyCompanyId
      ? bodyCompanyId
      : session.companyId;

  const employeeId = await generateEmployeeId(targetCompanyId);

  const employee = await Employee.create({
    companyId: targetCompanyId,
    employeeId,
    name: name.trim(),
    email: email.trim(),
    phone,
    designation: designation.trim(),
    type: type || "staff",
    department,
    joiningDate: new Date(joiningDate),
    endDate: endDate ? new Date(endDate) : undefined,
    salary: salary || 0,
    currency: currency || "INR",
    bankDetails,
    status: type === "intern" ? "active" : "active",
  });

  await logAudit({
    companyId: targetCompanyId,
    userId: session.userId,
    action: "create",
    module: "employees",
    details: `Created employee ${name.trim()} (${employeeId})`,
  });

  return NextResponse.json(employee, { status: 201 });
}
