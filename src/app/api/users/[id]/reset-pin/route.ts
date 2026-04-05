import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { issuePinReset } from "@/lib/pin-reset";
import User from "@/models/User";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "super_admin" && session.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const user = await User.findById(id).select("name email pin companyId whatsappNumber role");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (
    session.role !== "super_admin" &&
    (user.companyId.toString() !== session.companyId || user.role !== "staff")
  ) {
    return NextResponse.json({ error: "Managers can only reset staff users in their company" }, { status: 403 });
  }

  try {
    const result = await issuePinReset(user, {
      reason: "A PIN reset was issued by your administrator.",
    });

    return NextResponse.json({
      success: true,
      message: `A new PIN was sent via ${result.deliveryChannels.join(" and ")}.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PIN reset could not be delivered",
      },
      { status: 503 }
    );
  }
}