import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isValidEmailAddress, sendEmail } from "@/lib/email";
import { createUserNotification } from "@/lib/notifications";
import {
  isValidWhatsAppRecipient,
  sendWhatsAppMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp";
import Invoice from "@/models/Invoice";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const body = await request.json().catch(() => ({} as { channels?: unknown }));
  const requestedChannels: unknown[] = Array.isArray(body.channels)
    ? body.channels
    : ["email", "whatsapp"];
  const channels = requestedChannels.filter((channel): channel is "email" | "whatsapp" =>
    channel === "email" || channel === "whatsapp"
  );

  if (channels.length === 0) {
    return NextResponse.json({ error: "Select at least one delivery channel" }, { status: 400 });
  }

  const invoice = await Invoice.findById(id)
    .populate("clientId", "name company email phone address")
    .populate("projectId", "name")
    .populate("companyId", "name code currency address billingAddress logo gstNumber foreignRegistration footnote paymentDetails")
    .lean();

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json({ error: "Cancelled invoices cannot be sent" }, { status: 400 });
  }

  const client = invoice.clientId as {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  const company = invoice.companyId as {
    name?: string;
    code?: string;
    currency?: string;
    address?: string;
    billingAddress?: string;
    logo?: string;
    gstNumber?: string;
    foreignRegistration?: string;
    footnote?: string;
    paymentDetails?: string;
  };
  const invoiceItems = invoice.items as Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP";
  const clientEmail = client?.email?.trim() || "";
  const clientPhone = client?.phone?.trim() || "";
  const currency = invoice.currency || company?.currency || "INR";
  const totalLabel = `${currency} ${invoice.total?.toLocaleString()}`;
  const dueDateLabel = format(new Date(invoice.dueDate), "dd MMM yyyy");
  const issueDateLabel = format(new Date(invoice.issueDate), "dd MMM yyyy");
  const appOrigin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "";
  const invoiceUrl = appOrigin ? `${appOrigin}/dashboard/invoices/${invoice._id}` : "";

  const whatsappText = [
    `${company?.name || appName} invoice ${invoice.invoiceNumber}`,
    `Client: ${client?.name || "Client"}`,
    `Amount: ${totalLabel}`,
    `Issue Date: ${issueDateLabel}`,
    `Due Date: ${dueDateLabel}`,
    invoiceUrl ? `Reference: ${invoiceUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const companyAddress = company?.billingAddress || company?.address || "";

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 680px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          ${company?.logo ? `<img src="${company.logo}" alt="${company.name || ""}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 8px;" />` : ""}
          <h2 style="margin: 0 0 4px 0; font-size: 20px;">Invoice ${invoice.invoiceNumber}</h2>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">${company?.name || ""}</p>
          ${companyAddress ? `<p style="margin: 4px 0 0; font-size: 12px; color: #6b7280; white-space: pre-line;">${companyAddress}</p>` : ""}
          ${company?.gstNumber ? `<p style="margin: 2px 0 0; font-size: 12px; color: #6b7280;">GST: ${company.gstNumber}</p>` : ""}
        </div>
      </div>
      <p>Hello ${client?.name || "Client"},</p>
      <p>Please find your invoice details below.</p>
      <p><strong>Amount:</strong> ${totalLabel}</p>
      <p><strong>Issue date:</strong> ${issueDateLabel}</p>
      <p><strong>Due date:</strong> ${dueDateLabel}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr>
            <th style="border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px;">Description</th>
            <th style="border-bottom: 1px solid #e5e7eb; text-align: right; padding: 8px;">Qty</th>
            <th style="border-bottom: 1px solid #e5e7eb; text-align: right; padding: 8px;">Rate</th>
            <th style="border-bottom: 1px solid #e5e7eb; text-align: right; padding: 8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoiceItems
            .map(
              (item) => `
                <tr>
                  <td style="border-bottom: 1px solid #f3f4f6; padding: 8px;">${item.description}</td>
                  <td style="border-bottom: 1px solid #f3f4f6; padding: 8px; text-align: right;">${item.quantity}</td>
                  <td style="border-bottom: 1px solid #f3f4f6; padding: 8px; text-align: right;">${currency} ${item.rate?.toLocaleString()}</td>
                  <td style="border-bottom: 1px solid #f3f4f6; padding: 8px; text-align: right;">${currency} ${item.amount?.toLocaleString()}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
      ${invoice.notes ? `<p style="margin-top: 16px;"><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
      ${company?.paymentDetails ? `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb;"><strong>Payment Details:</strong><p style="font-size: 13px; color: #6b7280; white-space: pre-wrap;">${company.paymentDetails}</p></div>` : ""}
      ${company?.footnote ? `<p style="margin-top: 16px; font-size: 12px; color: #9ca3af; font-style: italic; text-align: center;">${company.footnote}</p>` : ""}
      ${invoiceUrl ? `<p style="margin-top: 16px;">Reference: <a href="${invoiceUrl}">${invoiceUrl}</a></p>` : ""}
    </div>
  `;

  const deliveredChannels: string[] = [];
  const deliveryErrors: string[] = [];

  if (channels.includes("email")) {
    if (!clientEmail) {
      deliveryErrors.push("Client email is missing");
    } else if (!isValidEmailAddress(clientEmail)) {
      deliveryErrors.push("Client email address is invalid.");
    } else {
      try {
        await sendEmail({
          to: clientEmail,
          subject: `Invoice ${invoice.invoiceNumber} from ${company?.name || appName}`,
          html: emailHtml,
        });
        deliveredChannels.push("email");
      } catch (error) {
        deliveryErrors.push(error instanceof Error ? error.message : "Email delivery failed");
      }
    }
  }

  if (channels.includes("whatsapp")) {
    if (!clientPhone) {
      deliveryErrors.push("Client WhatsApp number is missing");
    } else if (!isValidWhatsAppRecipient(clientPhone)) {
      deliveryErrors.push("Client WhatsApp number is invalid.");
    } else {
      try {
        if (invoice.pdfUrl) {
          await sendWhatsAppMessage({
            type: "document",
            recipient: clientPhone,
            message: whatsappText,
            documentUrl: invoice.pdfUrl,
            documentName: `${invoice.invoiceNumber}.pdf`,
            documentType: "pdf",
            priority: 1,
          });
        } else {
          await sendWhatsAppTextMessage({
            recipient: clientPhone,
            message: whatsappText,
            priority: 1,
          });
        }

        deliveredChannels.push("whatsapp");
      } catch (error) {
        deliveryErrors.push(
          error instanceof Error ? error.message : "WhatsApp delivery failed"
        );
      }
    }
  }

  if (deliveredChannels.length === 0) {
    return NextResponse.json(
      { error: deliveryErrors[0] || "Invoice could not be delivered" },
      { status: 503 }
    );
  }

  const update: Record<string, unknown> = {};

  if (invoice.status === "draft") {
    update.status = "sent";
  }

  if (!invoice.sentAt) {
    update.sentAt = new Date();
  }

  const updatedInvoice = Object.keys(update).length
    ? await Invoice.findByIdAndUpdate(id, update, { new: true })
        .populate("clientId", "name company email phone address")
        .populate("projectId", "name")
        .populate("companyId", "name code currency address")
        .lean()
    : invoice;

  try {
    await createUserNotification({
      userId: session.userId,
      companyId: session.companyId,
      type: "success",
      title: "Invoice delivered",
      message: `Invoice ${invoice.invoiceNumber} was sent via ${deliveredChannels.join(" and ")}.`,
      data: {
        invoiceId: invoice._id.toString(),
        channels: deliveredChannels,
      },
    });
  } catch (error) {
    console.error("Failed to create invoice delivery notification", error);
  }

  return NextResponse.json({
    success: true,
    message: `Invoice sent via ${deliveredChannels.join(" and ")}.`,
    deliveredChannels,
    deliveryErrors,
    invoice: updatedInvoice,
  });
}