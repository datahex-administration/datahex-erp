import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Company from "@/models/Company";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await connectDB();

  const user = await User.findById(session.userId).select("-pin").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const company = await Company.findById(session.companyId).lean();

  return NextResponse.json({
    user,
    company,
    permissions: session.permissions,
  });
}
