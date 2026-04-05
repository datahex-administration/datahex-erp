import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Subscription from "@/models/Subscription";
import { encrypt, decrypt } from "@/lib/encryption";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const sub = await Subscription.findById(id)
    .populate("projectId", "name")
    .lean();

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (sub.credentials) {
    try { sub.credentials = decrypt(sub.credentials); } catch { /* leave */ }
  }

  return NextResponse.json(sub);
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

  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.renewalDate) body.renewalDate = new Date(body.renewalDate);
  if (body.credentials) body.credentials = encrypt(body.credentials);

  const sub = await Subscription.findByIdAndUpdate(id, body, { new: true })
    .populate("projectId", "name");

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(sub);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Subscription.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
