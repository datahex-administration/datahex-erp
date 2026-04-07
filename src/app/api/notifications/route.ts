import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> = { userId: session.userId };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
    ];
  }

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return NextResponse.json({ data: notifications, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only manager/super_admin can create notifications
  if (session.role === "staff" || session.role === "customer_success") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await request.json();

  if (!body.title?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const type = ["info", "warning", "success", "error", "reminder"].includes(body.type)
    ? body.type
    : "info";

  let targetUserIds: string[] = [];

  if (body.userId && body.userId !== "all") {
    targetUserIds = [body.userId];
  } else {
    // Send to all active users in the company
    const users = await User.find({ companyId: session.companyId, isActive: true }).select("_id").lean();
    targetUserIds = users.map((u) => u._id.toString());
  }

  const docs = targetUserIds.map((uid) => ({
    userId: uid,
    companyId: session.companyId,
    type,
    title: body.title.trim(),
    message: body.message.trim(),
    read: false,
  }));

  await Notification.insertMany(docs);

  return NextResponse.json({ success: true, count: docs.length }, { status: 201 });
}
