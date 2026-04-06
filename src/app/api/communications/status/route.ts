import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEmailStatus } from "@/lib/email";
import { getWhatsAppStatus } from "@/lib/whatsapp";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.userId).select("whatsappNumber").lean();

  return NextResponse.json({
    email: getEmailStatus(),
    whatsapp: getWhatsAppStatus(),
    user: {
      hasWhatsappNumber: Boolean(user?.whatsappNumber),
      whatsappNumber: user?.whatsappNumber || null,
    },
  });
}