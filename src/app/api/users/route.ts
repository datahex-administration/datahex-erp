import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getRolePermissions, type RoleName } from "@/lib/permissions";
import { normalizeWhatsAppRecipient } from "@/lib/whatsapp";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId") || session.companyId;
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin"
      ? companyId
        ? { companyId }
        : {}
      : { companyId: session.companyId };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-pin")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({ data: users, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const body = await request.json();
  const { name, email, pin, role, companyId, permissions, whatsappNumber } = body;

  if (!name?.trim() || !email?.trim() || !pin || !whatsappNumber?.trim()) {
    return NextResponse.json(
      { error: "Name, email, WhatsApp number, and PIN are required" },
      { status: 400 }
    );
  }

  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 });
  }

  const normalizedWhatsApp = normalizeWhatsAppRecipient(whatsappNumber);
  const whatsappDigits = normalizedWhatsApp.replace(/\D/g, "");

  if (!normalizedWhatsApp || (!normalizedWhatsApp.includes("@") && whatsappDigits.length < 8)) {
    return NextResponse.json(
      { error: "A valid WhatsApp number is required" },
      { status: 400 }
    );
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  // Managers can only create staff in their own company
  const targetCompanyId =
    session.role === "super_admin" ? companyId || session.companyId : session.companyId;
  const targetRole: RoleName =
    session.role === "super_admin" && ["super_admin", "manager", "staff"].includes(role)
      ? role
      : "staff";

  const hashedPin = await hashPin(pin);
  const targetPermissions =
    Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : getRolePermissions(targetRole);

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    whatsappNumber: normalizedWhatsApp,
    pin: hashedPin,
    role: targetRole,
    companyId: targetCompanyId,
    permissions: targetPermissions,
  });

  const { pin: _, ...userWithoutPin } = user.toObject();
  return NextResponse.json(userWithoutPin, { status: 201 });
}
