import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Company from "@/models/Company";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { _id: session.companyId };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
    ];
  }

  const [companies, total] = await Promise.all([
    Company.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Company.countDocuments(filter),
  ]);

  return NextResponse.json({ data: companies, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await request.json();
  const { name, code, address, currency, logo } = body;

  if (!name?.trim() || !code?.trim()) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const existing = await Company.findOne({ code: code.toUpperCase().trim() });
  if (existing) {
    return NextResponse.json({ error: "Company code already exists" }, { status: 409 });
  }

  const company = await Company.create({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    address,
    currency: currency || "INR",
    logo,
  });

  return NextResponse.json(company, { status: 201 });
}
