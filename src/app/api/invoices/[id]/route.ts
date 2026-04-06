import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
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

  const invoice = await Invoice.findById(id)
    .populate("clientId", "name company email phone address")
    .populate("projectId", "name")
    .populate("companyId", "name code currency address")
    .lean();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(invoice);
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

  // Recalculate totals if items changed
  if (body.items) {
    body.items = body.items.map((item: { description: string; quantity: number; rate: number }) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      amount: (Number(item.quantity) || 1) * (Number(item.rate) || 0),
    }));
    body.subtotal = body.items.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
    const taxPct = body.taxPercent ?? 0;
    body.tax = Math.round(body.subtotal * taxPct) / 100;
    body.total = body.subtotal + body.tax;
  }

  if (body.dueDate) body.dueDate = new Date(body.dueDate);
  if (body.status === "sent" && !body.sentAt) body.sentAt = new Date();
  if (body.status === "paid" && !body.paidAt) body.paidAt = new Date();

  const invoice = await Invoice.findByIdAndUpdate(id, body, { new: true })
    .populate("clientId", "name company email")
    .populate("projectId", "name");

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status) {
    await logAudit({
      companyId: invoice.companyId.toString(),
      userId: session.userId,
      action: `update:${body.status}`,
      module: "invoices",
      details: `Invoice ${invoice.invoiceNumber} marked as ${body.status}`,
    });
  }

  return NextResponse.json(invoice);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const invoice = await Invoice.findById(id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Cannot delete a paid invoice" }, { status: 400 });
  }

  await Invoice.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
