import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { issuePinReset } from "@/lib/pin-reset";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email, isActive: true }).select(
      "name email pin companyId whatsappNumber"
    );

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If the account exists, a new PIN has been sent.",
      });
    }

    const result = await issuePinReset(user, {
      reason: "A PIN reset was requested from the login screen.",
    });

    return NextResponse.json({
      success: true,
      message: `A new PIN was sent via ${result.deliveryChannels.join(" and ")}.`,
    });
  } catch (error) {
    console.error("PIN reset error:", error);
    return NextResponse.json(
      { error: "PIN reset could not be delivered. Contact your administrator." },
      { status: 503 }
    );
  }
}