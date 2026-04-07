import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";
import { getRolePermissions, type RoleName } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.userId).select("-pin").lean().exec();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const company = await Company.findById(session.companyId).lean().exec();

  // Always derive permissions from role definition so code updates take effect immediately
  const permissions = getRolePermissions(session.role as RoleName);

  return NextResponse.json({
    user,
    company,
    permissions,
  });
}
