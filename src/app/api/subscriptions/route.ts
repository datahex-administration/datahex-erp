import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Subscription from "@/models/Subscription";
import { encrypt, decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const upcoming = searchParams.get("upcoming"); // "30" for next 30 days
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { provider: { $regex: search, $options: "i" } },
    ];
  }
  if (upcoming) {
    const days = Number(upcoming);
    const future = new Date();
    future.setDate(future.getDate() + days);
    filter.renewalDate = { $lte: future, $gte: new Date() };
    filter.status = "active";
  }

  const [subs, total] = await Promise.all([
    Subscription.find(filter)
      .populate("projectId", "name")
      .sort({ renewalDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  // Decrypt credentials for display
  const decrypted = subs.map((s) => {
    const sub = { ...s };
    if (sub.credentials) {
      try {
        sub.credentials = decrypt(sub.credentials);
      } catch {
        // leave as-is
      }
    }
    return sub;
  });

  return NextResponse.json({ data: decrypted, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();

  const { name, provider, type, cost, currency, frequency, startDate, renewalDate, autoRenew, credentials, projectId, notes } = body;

  if (!name?.trim() || !provider?.trim() || !type || !cost || !frequency || !startDate || !renewalDate) {
    return NextResponse.json(
      { error: "Name, provider, type, cost, frequency, start date, and renewal date are required" },
      { status: 400 }
    );
  }

  const sub = await Subscription.create({
    companyId: session.companyId,
    projectId: projectId || undefined,
    name: name.trim(),
    provider: provider.trim(),
    type,
    cost: Number(cost),
    currency: currency || "USD",
    frequency,
    startDate: new Date(startDate),
    renewalDate: new Date(renewalDate),
    autoRenew: autoRenew ?? true,
    credentials: credentials ? encrypt(credentials) : undefined,
    notes,
  });

  return NextResponse.json(sub, { status: 201 });
}
