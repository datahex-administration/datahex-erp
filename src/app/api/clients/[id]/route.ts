import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isValidEmailAddress } from "@/lib/email";
import Client from "@/models/Client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const clientFilter =
    session.role === "super_admin"
      ? { _id: id }
      : { _id: id, companyId: session.companyId };

  const client = await Client.findOne(clientFilter).lean().exec();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(client);
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
  const update: Record<string, unknown> = { ...body };
  const clientFilter =
    session.role === "super_admin"
      ? { _id: id }
      : { _id: id, companyId: session.companyId };

  if (typeof body.name === "string") {
    const trimmedName = body.name.trim();

    if (!trimmedName) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }

    update.name = trimmedName;
  }

  if (typeof body.email === "string") {
    const trimmedEmail = body.email.trim().toLowerCase();

    if (!trimmedEmail || !isValidEmailAddress(trimmedEmail)) {
      return NextResponse.json({ error: "Client email address is invalid" }, { status: 400 });
    }

    update.email = trimmedEmail;
  }

  if (typeof body.phone === "string") {
    update.phone = body.phone.trim() || undefined;
  }

  if (typeof body.company === "string") {
    update.company = body.company.trim() || undefined;
  }

  if (typeof body.contactPersonName === "string") {
    update.contactPersonName = body.contactPersonName.trim() || undefined;
  }

  if (typeof body.address === "string") {
    update.address = body.address.trim() || undefined;
  }

  if (typeof body.additionalDetails === "string") {
    update.additionalDetails = body.additionalDetails.trim() || undefined;
  }

  const client = await Client.findOneAndUpdate(clientFilter, update, { new: true }).lean().exec();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const clientFilter =
    session.role === "super_admin"
      ? { _id: id }
      : { _id: id, companyId: session.companyId };

  const client = await Client.findOneAndUpdate(clientFilter, { isActive: false }, { new: true })
    .lean()
    .exec();
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
