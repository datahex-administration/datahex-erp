import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import BugReport from "@/models/BugReport";
import "@/models/Project";
import "@/models/Employee";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const projectId = searchParams.get("projectId");
  const assignedTo = searchParams.get("assignedTo");
  const search = searchParams.get("search");
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (status && status !== "all") filter.status = status;
  if (priority && priority !== "all") filter.priority = priority;
  if (projectId && projectId !== "all") filter.projectId = projectId;
  if (assignedTo && assignedTo !== "all") filter.assignedTo = assignedTo;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const [bugs, total] = await Promise.all([
    BugReport.find(filter)
      .populate("projectId", "name")
      .populate("assignedTo", "name employeeId designation")
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BugReport.countDocuments(filter),
  ]);

  return NextResponse.json({
    data: bugs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const body = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.projectId) {
    return NextResponse.json({ error: "Project is required" }, { status: 400 });
  }

  try {
    const bug = await BugReport.create({
      companyId: session.companyId,
      projectId: body.projectId,
      title: body.title.trim(),
      description: body.description?.trim() || undefined,
      stepsToReproduce: body.stepsToReproduce?.trim() || undefined,
      priority: ["low", "medium", "high", "critical"].includes(body.priority)
        ? body.priority
        : "medium",
      status: "open",
      reportedBy: session.userId,
      assignedTo: body.assignedTo || undefined,
      environment: body.environment?.trim() || undefined,
      screenshot: body.screenshot || undefined,
    });

    const populated = await BugReport.findById(bug._id)
      .populate("projectId", "name")
      .populate("assignedTo", "name employeeId designation")
      .populate("reportedBy", "name email")
      .lean();

    await logAudit({
      companyId: session.companyId!,
      userId: session.userId,
      action: "create",
      module: "bugs",
      details: `Reported bug: ${body.title.trim()}`,
    });

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("Bug report creation error:", err);
    return NextResponse.json({ error: "Failed to create bug report" }, { status: 500 });
  }
}
