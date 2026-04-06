import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getRolePermissions, type RoleName } from "@/lib/permissions";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select("-pin").lean();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.role !== "super_admin" &&
    user.companyId?.toString() !== session.companyId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const existingUser = await User.findById(id);
  if (!existingUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.role !== "super_admin" &&
    existingUser.companyId.toString() !== session.companyId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    session.role !== "super_admin" &&
    existingUser.role !== "staff"
  ) {
    return NextResponse.json({ error: "Managers can only update staff users" }, { status: 403 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (body.name) update.name = body.name.trim();
  if (body.role && session.role === "super_admin") {
    const nextRole: RoleName = ["super_admin", "manager", "staff"].includes(body.role)
      ? body.role
      : existingUser.role;
    update.role = nextRole;
    if (!body.permissions) {
      update.permissions = getRolePermissions(nextRole);
    }
  }
  if (body.permissions && Array.isArray(body.permissions)) update.permissions = body.permissions;
  if (body.isActive !== undefined) update.isActive = body.isActive;
  if (body.pin && /^\d{6}$/.test(body.pin)) {
    update.pin = await hashPin(body.pin);
  }

  if (body.whatsappNumber !== undefined) {
    const normalizedWhatsApp = normalizeWhatsAppRecipient(body.whatsappNumber || "");
    const whatsappDigits = normalizedWhatsApp.replace(/\D/g, "");

    if (!normalizedWhatsApp || (!normalizedWhatsApp.includes("@") && whatsappDigits.length < 8)) {
      return NextResponse.json(
        { error: "A valid WhatsApp number is required" },
        { status: 400 }
      );
    }

    update.whatsappNumber = normalizedWhatsApp;
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("-pin");
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(user);
}
