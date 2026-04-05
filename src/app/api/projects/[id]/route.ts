import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Project from "@/models/Project";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const project = await Project.findById(id)
    .populate("clientId", "name company email phone address")
    .populate("managerId", "name employeeId designation")
    .populate("team", "name employeeId designation")
    .populate("companyId", "name code currency")
    .lean();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
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

  // Handle date conversions
  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.deadline) body.deadline = new Date(body.deadline);

  const project = await Project.findByIdAndUpdate(id, body, { new: true })
    .populate("clientId", "name company email")
    .populate("managerId", "name employeeId")
    .populate("team", "name employeeId");

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Project.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
