import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const clientId = searchParams.get("clientId");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (status) filter.status = status;
  if (clientId) filter.clientId = clientId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("clientId", "name company email contactPersonName")
      .populate("managerId", "name employeeId designation userId")
      .populate("managerUserId", "name email role")
      .populate("companyId", "name code")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  return NextResponse.json({ data: projects, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const {
    name, clientId, description, status, startDate, deadline,
    managerId, managerUserId, team, budget, currency, companyId: bodyCompanyId,
  } = body;

  if (!name?.trim() || !clientId) {
    return NextResponse.json({ error: "Name and client are required" }, { status: 400 });
  }

  const targetCompanyId =
    session.role === "super_admin" && bodyCompanyId ? bodyCompanyId : session.companyId;

  const defaultStages = [
    { name: "Requirement Gathering", status: "pending", order: 0 },
    { name: "Design", status: "pending", order: 1 },
    { name: "Development", status: "pending", order: 2 },
    { name: "Testing", status: "pending", order: 3 },
    { name: "Deployment", status: "pending", order: 4 },
  ];

  const project = await Project.create({
    companyId: targetCompanyId,
    clientId,
    name: name.trim(),
    description,
    status: status || "requirement",
    startDate: startDate ? new Date(startDate) : undefined,
    deadline: deadline ? new Date(deadline) : undefined,
    managerId: managerId || undefined,
    managerUserId: managerUserId || undefined,
    team: team || [],
    budget: budget ? Number(budget) : undefined,
    currency: currency || "INR",
    stages: defaultStages,
  });

  await logAudit({
    companyId: targetCompanyId,
    userId: session.userId,
    action: "create",
    module: "projects",
    details: `Created project "${name.trim()}"`,
  });

  return NextResponse.json(project, { status: 201 });
}
