import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const projectId = searchParams.get("projectId");
  const search = searchParams.get("search");
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 100);

  const filter: Record<string, unknown> =
    session.role === "super_admin" ? {} : { companyId: session.companyId };

  if (status) filter.status = status;
  if (clientId) filter.clientId = clientId;
  if (projectId) filter.projectId = projectId;
  if (search) {
    filter.$or = [
      { invoiceNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate("clientId", "name company email")
      .populate("projectId", "name")
      .populate("companyId", "name code logo")
      .sort({ issueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return NextResponse.json({ data: invoices, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const body = await request.json();

  const { clientId, projectId, type, items, taxPercent, currency, dueDate, notes, companyId: bodyCompanyId } = body;

  // super_admin can specify a different companyId; otherwise use session
  const rawCompanyId = (session.role === "super_admin" && bodyCompanyId && bodyCompanyId.trim()) ? bodyCompanyId.trim() : session.companyId;

  // Validate that companyId is a valid ObjectId
  if (!rawCompanyId || !mongoose.Types.ObjectId.isValid(rawCompanyId)) {
    return NextResponse.json({ error: "A valid company is required" }, { status: 400 });
  }
  const companyId = rawCompanyId;

  if (!clientId || !mongoose.Types.ObjectId.isValid(clientId)) {
    return NextResponse.json({ error: "A valid client is required" }, { status: 400 });
  }

  if (!items?.length || !dueDate) {
    return NextResponse.json(
      { error: "At least one item and due date are required" },
      { status: 400 }
    );
  }

  try {
  // Calculate totals
  const computedItems = items.map((item: { description: string; quantity: number; rate: number }) => ({
    description: item.description,
    quantity: Number(item.quantity) || 1,
    rate: Number(item.rate) || 0,
    amount: (Number(item.quantity) || 1) * (Number(item.rate) || 0),
  }));

  const subtotal = computedItems.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
  const taxPct = Number(taxPercent) || 0;
  const tax = Math.round(subtotal * taxPct) / 100;
  const total = subtotal + tax;

  // Generate invoice number: INV-YYYYMM-XXXX
  const now = new Date();
  const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastInvoice = await Invoice.findOne(
    { invoiceNumber: { $regex: `^${prefix}-` } },
    { invoiceNumber: 1 },
    { sort: { invoiceNumber: -1 } }
  ).lean();
  let nextSeq = 1;
  if (lastInvoice && typeof lastInvoice.invoiceNumber === "string") {
    const parts = lastInvoice.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  const invoiceNumber = `${prefix}-${String(nextSeq).padStart(4, "0")}`;

  const invoice = await Invoice.create({
    companyId: companyId,
    clientId,
    projectId: (projectId && mongoose.Types.ObjectId.isValid(projectId)) ? projectId : undefined,
    invoiceNumber,
    type: type || "project",
    items: computedItems,
    subtotal,
    tax,
    taxPercent: taxPct,
    total,
    currency: currency || "INR",
    status: "draft",
    issueDate: now,
    dueDate: new Date(dueDate),
    notes,
  });

  await logAudit({
    companyId: companyId,
    userId: session.userId,
    action: "create",
    module: "invoices",
    details: `Created invoice ${invoiceNumber} — ${currency || "INR"} ${total}`,
  });

  return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice creation error:", error);
    const message = error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
