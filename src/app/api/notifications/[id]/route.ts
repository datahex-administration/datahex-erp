import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: session.userId },
    { read: true },
    { new: true }
  );

  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(notification);
}
