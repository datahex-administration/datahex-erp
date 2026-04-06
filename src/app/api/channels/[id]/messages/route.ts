import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Channel from "@/models/Channel";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  // Verify membership
  const channel = await Channel.findById(id);
  if (!channel || !channel.members.some((m: { toString: () => string }) => m.toString() === session.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const before = searchParams.get("before"); // cursor for pagination
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const filter: Record<string, unknown> = { channelId: id };
  if (before) filter.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(filter)
    .populate("senderId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(messages.reverse());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  // Verify membership
  const channel = await Channel.findById(id);
  if (!channel || !channel.members.some((m: { toString: () => string }) => m.toString() === session.userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content, type, fileUrl, fileName } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const message = await Message.create({
    companyId: session.companyId,
    channelId: id,
    senderId: session.userId,
    content: content.trim(),
    type: type || "text",
    fileUrl,
    fileName,
    readBy: [session.userId],
  });

  // Update channel last message
  await Channel.findByIdAndUpdate(id, {
    lastMessage: content.trim().substring(0, 100),
    lastMessageAt: new Date(),
  });

  const populated = await Message.findById(message._id).populate("senderId", "name email");

  return NextResponse.json(populated, { status: 201 });
}
