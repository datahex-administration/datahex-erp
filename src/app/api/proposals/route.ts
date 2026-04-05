import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Proposal from "@/models/Proposal";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (projectId) filter.projectId = projectId;
  if (status) filter.status = status;

  const proposals = await Proposal.find(filter)
    .populate("projectId", "name")
    .populate("clientId", "name email company")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(proposals);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();
  const { projectId, clientId, title, content, sections, amount, currency, validUntil, notes } = body;

  if (!projectId || !clientId || !title?.trim() || !amount) {
    return NextResponse.json({ error: "Project, client, title, and amount are required" }, { status: 400 });
  }

  const proposal = await Proposal.create({
    projectId,
    companyId: session.companyId,
    clientId,
    title: title.trim(),
    content: content || "",
    sections: sections || [],
    amount: Number(amount),
    currency: currency || "INR",
    validUntil: validUntil ? new Date(validUntil) : undefined,
    notes,
  });

  return NextResponse.json(proposal, { status: 201 });
}
