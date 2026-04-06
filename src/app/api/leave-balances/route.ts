import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import LeaveBalance from "@/models/LeaveBalance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const year = searchParams.get("year") || new Date().getFullYear();

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  filter.year = Number(year);
  if (employeeId) filter.employeeId = employeeId;

  const balances = await LeaveBalance.find(filter)
    .populate("employeeId", "name employeeId")
    .sort({ employeeId: 1 })
    .lean();

  return NextResponse.json(balances);
}

// Initialize or reset balances for all employees
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { employeeId, year, sick, casual, earned } = body;

  if (!employeeId || !year) {
    return NextResponse.json({ error: "Employee and year required" }, { status: 400 });
  }

  const balance = await LeaveBalance.findOneAndUpdate(
    { employeeId, year: Number(year) },
    {
      companyId: session.companyId,
      employeeId,
      year: Number(year),
      balances: {
        sick: { total: sick?.total ?? 12, used: sick?.used ?? 0, remaining: (sick?.total ?? 12) - (sick?.used ?? 0) },
        casual: { total: casual?.total ?? 12, used: casual?.used ?? 0, remaining: (casual?.total ?? 12) - (casual?.used ?? 0) },
        earned: { total: earned?.total ?? 15, used: earned?.used ?? 0, remaining: (earned?.total ?? 15) - (earned?.used ?? 0) },
      },
    },
    { new: true, upsert: true }
  );

  return NextResponse.json(balance);
}
