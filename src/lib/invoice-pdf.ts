/**
 * Generate a self-contained A4 invoice HTML string.
 * Used for both the printable preview page and the download flow.
 */

interface InvoiceCompany {
  name?: string;
  logo?: string;
  billingAddress?: string;
  address?: string;
  gstNumber?: string;
  foreignRegistration?: string;
  paymentDetails?: string;
  footnote?: string;
}

interface InvoiceClient {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  type?: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxPercent: number;
  total: number;
  currency: string;
  status: string;
  notes?: string;
  projectName?: string;
  companyId?: InvoiceCompany;
  clientId?: InvoiceClient;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function generateInvoiceHTML(invoice: InvoiceData): string {
  const company = invoice.companyId;
  const client = invoice.clientId;
  const currency = invoice.currency || "INR";
  const isPaid = invoice.status === "paid";
  const companyAddress = company?.billingAddress || company?.address || "";

  const itemRows = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="border:1px solid #d1d5db; padding:8px 10px; font-size:12px; color:#374151; text-align:center; width:70px;">${item.quantity.toFixed(2)}</td>
        <td style="border:1px solid #d1d5db; padding:8px 10px; font-size:12px; color:#374151;">${item.description}</td>
        <td style="border:1px solid #d1d5db; padding:8px 10px; font-size:12px; color:#374151; text-align:right; width:110px;">${fmtAmount(item.rate, currency)}</td>
        <td style="border:1px solid #d1d5db; padding:8px 10px; font-size:12px; color:#374151; text-align:right; width:110px;">${fmtAmount(item.amount, currency)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    color: #1f2937;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 48px 52px;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 40px 48px; }
    .no-print { display: none !important; }
  }
  @media screen {
    body { background: #e5e7eb; padding: 24px 0; }
    .page {
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      border-radius: 4px;
      background: #fff;
    }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ===== ROW 1: Logo + Invoice Title ===== -->
  <table style="width:100%; margin-bottom:24px;">
    <tr>
      <td style="vertical-align:top; width:50%;">
        ${company?.logo ? `<img src="${company.logo}" alt="${company.name || ""}" style="max-height:52px; max-width:220px; object-fit:contain;" />` : ""}
      </td>
      <td style="vertical-align:top; text-align:right;">
        <div style="font-size:32px; font-weight:700; color:#1f2937; letter-spacing:-0.5px;">Invoice</div>
      </td>
    </tr>
  </table>

  <!-- ===== ROW 2: From (company) + Invoice Details Table ===== -->
  <table style="width:100%; margin-bottom:28px;">
    <tr>
      <td style="vertical-align:top; width:50%; padding-right:24px;">
        <div style="font-size:12px; font-weight:700; color:#374151; margin-bottom:4px;">From:</div>
        <div style="font-size:13px; font-weight:600; color:#2563eb;">${company?.name || ""}</div>
        ${companyAddress ? `<div style="font-size:12px; color:#4b5563; white-space:pre-line; line-height:1.6; margin-top:2px;">${companyAddress}</div>` : ""}
        ${company?.gstNumber ? `<div style="font-size:12px; color:#4b5563; margin-top:2px;">GST: ${company.gstNumber}</div>` : ""}
        ${company?.foreignRegistration ? `<div style="font-size:12px; color:#4b5563;">Reg: ${company.foreignRegistration}</div>` : ""}
      </td>
      <td style="vertical-align:top; width:50%;">
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:600; color:#374151; background:#f9fafb; width:45%;">Invoice Number</td>
            <td style="border:1px solid #d1d5db; padding:6px 10px; color:#1f2937;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:600; color:#374151; background:#f9fafb;">Invoice Date</td>
            <td style="border:1px solid #d1d5db; padding:6px 10px; color:#1f2937;">${fmtDate(invoice.issueDate)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:600; color:#374151; background:#f9fafb;">Due Date</td>
            <td style="border:1px solid #d1d5db; padding:6px 10px; color:#1f2937;">${fmtDate(invoice.dueDate)}</td>
          </tr>
          ${invoice.paidAt ? `
          <tr>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:600; color:#374151; background:#f9fafb;">Paid On</td>
            <td style="border:1px solid #d1d5db; padding:6px 10px; color:#16a34a; font-weight:600;">${fmtDate(invoice.paidAt)}</td>
          </tr>` : ""}
          <tr>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:700; color:#374151; background:#f1f5f9;">Total Due</td>
            <td style="border:1px solid #d1d5db; padding:6px 10px; font-weight:700; font-size:14px; color:#0f172a; background:#f1f5f9;">${fmtAmount(invoice.total, currency)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- ===== ROW 3: To (client) ===== -->
  <div style="margin-bottom:28px;">
    <div style="font-size:12px; font-weight:700; color:#374151; margin-bottom:4px;">To:</div>
    <div style="font-size:13px; font-weight:600; color:#1f2937;">${client?.name || ""}</div>
    ${client?.company ? `<div style="font-size:12px; color:#4b5563;">${client.company}</div>` : ""}
    ${client?.address ? `<div style="font-size:12px; color:#4b5563; white-space:pre-line; line-height:1.5; margin-top:2px;">${client.address}</div>` : ""}
    ${client?.email ? `<div style="font-size:12px; color:#4b5563; margin-top:2px;">${client.email}</div>` : ""}
    ${client?.phone ? `<div style="font-size:12px; color:#4b5563;">${client.phone}</div>` : ""}
  </div>

  ${invoice.projectName ? `<div style="font-size:12px; color:#6b7280; margin-bottom:12px;">Project: <span style="font-weight:600; color:#374151;">${invoice.projectName}</span></div>` : ""}

  <!-- ===== LINE ITEMS TABLE ===== -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
    <thead>
      <tr>
        <th style="border:1px solid #d1d5db; padding:8px 10px; text-align:center; font-size:12px; font-weight:700; color:#374151; background:#f1f5f9; width:70px;">Hrs/Qty</th>
        <th style="border:1px solid #d1d5db; padding:8px 10px; text-align:left; font-size:12px; font-weight:700; color:#374151; background:#f1f5f9;">Service</th>
        <th style="border:1px solid #d1d5db; padding:8px 10px; text-align:right; font-size:12px; font-weight:700; color:#374151; background:#f1f5f9; width:110px;">Rate/Price</th>
        <th style="border:1px solid #d1d5db; padding:8px 10px; text-align:right; font-size:12px; font-weight:700; color:#374151; background:#f1f5f9; width:110px;">Sub Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- ===== TOTALS (right-aligned) ===== -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:28px;">
    <tr>
      <td style="width:55%;"></td>
      <td style="border:1px solid #d1d5db; padding:6px 10px; text-align:right; font-size:12px; font-weight:600; color:#374151; background:#f9fafb; width:25%;">Sub Total</td>
      <td style="border:1px solid #d1d5db; padding:6px 10px; text-align:right; font-size:12px; color:#1f2937; width:20%;">${fmtAmount(invoice.subtotal, currency)}</td>
    </tr>
    ${invoice.tax > 0 ? `
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:6px 10px; text-align:right; font-size:12px; font-weight:600; color:#374151; background:#f9fafb;">Tax (${invoice.taxPercent}%)</td>
      <td style="border:1px solid #d1d5db; padding:6px 10px; text-align:right; font-size:12px; color:#1f2937;">${fmtAmount(invoice.tax, currency)}</td>
    </tr>` : ""}
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:8px 10px; text-align:right; font-size:13px; font-weight:700; color:#0f172a; background:#f1f5f9;">Total</td>
      <td style="border:1px solid #d1d5db; padding:8px 10px; text-align:right; font-size:13px; font-weight:700; color:#0f172a; background:#f1f5f9;">${fmtAmount(invoice.total, currency)}</td>
    </tr>
  </table>

  <!-- ===== PAID WATERMARK ===== -->
  ${isPaid ? `
  <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:100px; font-weight:900; color:rgba(22,163,74,0.08); text-transform:uppercase; pointer-events:none; z-index:0;">PAID</div>` : ""}

  <!-- ===== Payment Details (bottom-left, like bank info) ===== -->
  ${company?.paymentDetails ? `
  <div style="margin-bottom:16px;">
    <div style="font-size:12px; color:#4b5563; white-space:pre-wrap; line-height:1.6;">${company.paymentDetails}</div>
  </div>` : ""}

  <!-- ===== Notes ===== -->
  ${invoice.notes ? `
  <div style="margin-bottom:16px;">
    <div style="font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;">Notes</div>
    <div style="font-size:12px; color:#4b5563; white-space:pre-wrap; line-height:1.5;">${invoice.notes}</div>
  </div>` : ""}

  <!-- ===== Spacer to push footnote to bottom ===== -->
  <div style="flex:1;"></div>

  <!-- ===== Footnote (bottom of page) ===== -->
  ${company?.footnote ? `
  <div style="border-top:1px solid #e5e7eb; padding-top:12px;">
    <div style="font-size:11px; color:#6b7280; line-height:1.5;">${company.footnote}</div>
  </div>` : ""}

</div>
</body>
</html>`;
}
