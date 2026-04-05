import { NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit({
      companyId: session.companyId,
      userId: session.userId,
      action: "logout",
      module: "auth",
    });
  }
  await destroySession();
  return NextResponse.json({ success: true });
}
