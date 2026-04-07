import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import BugReport from "@/models/BugReport";
import Company from "@/models/Company";
import "@/models/Project";
import "@/models/Employee";
import { generateBugReportHTML } from "@/lib/bug-report-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const bug = await BugReport.findById(id)
    .populate("projectId", "name")
    .populate("assignedTo", "name employeeId designation")
    .populate("reportedBy", "name email")
    .lean();

  if (!bug) {
    return NextResponse.json({ error: "Bug not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = bug as any;

  const company = await Company.findById(b.companyId).lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (company || {}) as any;

  const html = generateBugReportHTML({
    company: {
      name: comp.name,
      logo: comp.logo,
      address: comp.address,
      billingAddress: comp.billingAddress,
    },
    title: b.title,
    description: b.description,
    stepsToReproduce: b.stepsToReproduce,
    priority: b.priority,
    status: b.status,
    environment: b.environment,
    projectName: b.projectId?.name,
    assignedToName: b.assignedTo?.name,
    assignedToDesignation: b.assignedTo?.designation,
    reportedByName: b.reportedBy?.name,
    reportedByEmail: b.reportedBy?.email,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    resolvedAt: b.resolvedAt,
    closedAt: b.closedAt,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
