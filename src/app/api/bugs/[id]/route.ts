import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import BugReport from "@/models/BugReport";
import "@/models/Project";
import "@/models/Employee";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const bug = await BugReport.findById(id)
    .populate("projectId", "name")
    .populate("assignedTo", "name employeeId designation")
    .populate("reportedBy", "name email")
    .lean();

  if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(bug);
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

  // Auto-set resolvedAt / closedAt when status changes
  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.description !== undefined) update.description = body.description.trim();
  if (body.stepsToReproduce !== undefined) update.stepsToReproduce = body.stepsToReproduce.trim();
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo || null;
  if (body.environment !== undefined) update.environment = body.environment;
  if (body.projectId !== undefined) update.projectId = body.projectId;
  if (body.screenshot !== undefined) update.screenshot = body.screenshot;

  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "resolved") update.resolvedAt = new Date();
    if (body.status === "closed") update.closedAt = new Date();
    if (body.status === "reopened") {
      update.resolvedAt = null;
      update.closedAt = null;
    }
  }

  const bug = await BugReport.findByIdAndUpdate(id, update, { new: true })
    .populate("projectId", "name")
    .populate("assignedTo", "name employeeId designation")
    .populate("reportedBy", "name email");

  if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    companyId: bug.companyId.toString(),
    userId: session.userId,
    action: "update",
    module: "bugs",
    details: `Updated bug: ${bug.title}${body.status ? ` → ${body.status}` : ""}`,
  });

  return NextResponse.json(bug);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const bug = await BugReport.findByIdAndDelete(id);
  if (!bug) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    companyId: bug.companyId.toString(),
    userId: session.userId,
    action: "delete",
    module: "bugs",
    details: `Deleted bug: ${bug.title}`,
  });

  return NextResponse.json({ success: true });
}
