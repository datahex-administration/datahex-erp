import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Proposal from "@/models/Proposal";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const proposal = await Proposal.findById(id)
    .populate("projectId", "name description")
    .populate("clientId", "name email company phone address")
    .populate("companyId", "name code address")
    .lean();

  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(proposal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const body = await request.json();

  // Track status changes
  if (body.status === "sent" && !body.sentAt) {
    body.sentAt = new Date();
  }
  if ((body.status === "accepted" || body.status === "rejected") && !body.respondedAt) {
    body.respondedAt = new Date();
  }

  const proposal = await Proposal.findByIdAndUpdate(id, body, { new: true });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(proposal);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Proposal.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
