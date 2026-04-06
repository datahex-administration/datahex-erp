import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Channel from "@/models/Channel";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const channels = await Channel.find({
    members: session.userId,
    ...(session.role === "super_admin" ? {} : { companyId: session.companyId }),
  })
    .populate("members", "name email")
    .populate("projectId", "name")
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .lean();

  return NextResponse.json(channels);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { name, type, members, projectId } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
  }

  const memberIds = Array.isArray(members) ? members : [];
  // Always include the creator
  if (!memberIds.includes(session.userId)) {
    memberIds.push(session.userId);
  }

  const channel = await Channel.create({
    companyId: session.companyId,
    name: name.trim(),
    type: type || "group",
    members: memberIds,
    projectId: projectId || undefined,
    createdBy: session.userId,
  });

  const populated = await Channel.findById(channel._id)
    .populate("members", "name email")
    .populate("projectId", "name");

  return NextResponse.json(populated, { status: 201 });
}
