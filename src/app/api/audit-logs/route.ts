import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin and managers can view audit logs
  if (session.role === "staff" || session.role === "customer_success") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const { searchParams } = request.nextUrl;
  const module = searchParams.get("module");
  const action = searchParams.get("action");
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (module) filter.module = module;
  if (action) filter.action = { $regex: action, $options: "i" };

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return NextResponse.json({ data: logs, total, page, totalPages: Math.ceil(total / limit) });
}
