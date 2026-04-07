import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Invoice from "@/models/Invoice";
import { generateInvoiceHTML } from "@/lib/invoice-pdf";

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

  const invoice = await Invoice.findById(id)
    .populate("clientId", "name company email phone address")
    .populate("projectId", "name")
    .populate(
      "companyId",
      "name code currency address billingAddress logo gstNumber foreignRegistration footnote paymentDetails"
    )
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  const html = generateInvoiceHTML({
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    items: inv.items || [],
    subtotal: inv.subtotal,
    tax: inv.tax,
    taxPercent: inv.taxPercent,
    total: inv.total,
    currency: inv.currency,
    status: inv.status,
    notes: inv.notes,
    projectName: inv.projectId?.name,
    companyId: inv.companyId,
    clientId: inv.clientId,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
