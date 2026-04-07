/**
 * Generate a self-contained A4 salary slip HTML.
 * Opened in a new tab so the user can Ctrl+P / Cmd+P to save as PDF.
 */

interface SlipCompany {
  name?: string;
  logo?: string;
  address?: string;
  billingAddress?: string;
}

interface SlipEmployee {
  employeeName: string;
  employeeId: string;
  designation?: string;
  department?: string;
}

interface SlipData {
  company: SlipCompany;
  employee: SlipEmployee;
  month: number;
  year: number;
  baseSalary: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  currency: string;
  processedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function generateSalarySlipHTML(data: SlipData): string {
  const { company, employee, month, year, currency } = data;
  const companyName = company.name || "Company";
  const companyAddress = company.billingAddress || company.address || "";
  const monthName = MONTHS[month - 1] || "";
  const isPaid = data.status === "paid";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Salary Slip – ${employee.employeeName} – ${monthName} ${year}</title>
<style>
  @page { size: A4; margin: 0; }
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
  .info-table td { padding: 4px 0; font-size: 13px; }
  .info-table td:first-child { color: #6b7280; width: 140px; }
  .info-table td:last-child { font-weight: 600; color: #1f2937; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div style="text-align:center; margin-bottom:8px;">
    ${company.logo
      ? `<img src="${company.logo}" alt="${companyName}" style="max-height:52px; max-width:220px; object-fit:contain; margin-bottom:6px;" />`
      : ""}
    <div style="font-size:20px; font-weight:700; color:#1f2937; letter-spacing:0.3px;">${companyName}</div>
    ${companyAddress
      ? `<div style="font-size:11px; color:#6b7280; margin-top:2px; white-space:pre-line; line-height:1.4;">${companyAddress}</div>`
      : ""}
  </div>

  <hr style="border:none; border-top:2px solid #1f2937; margin:12px 0 20px;" />

  <!-- TITLE -->
  <div style="text-align:center; margin-bottom:24px;">
    <div style="font-size:18px; font-weight:700; color:#1f2937; letter-spacing:0.5px; text-transform:uppercase;">
      Salary Slip
    </div>
    <div style="font-size:14px; color:#4b5563; margin-top:4px;">
      For the month of <strong>${monthName} ${year}</strong>
    </div>
  </div>

  <!-- EMPLOYEE DETAILS -->
  <table style="width:100%; margin-bottom:28px; border-collapse:collapse;">
    <tr>
      <td style="vertical-align:top; width:50%; padding-right:16px;">
        <table class="info-table" style="border-collapse:collapse;">
          <tr><td>Employee Name</td><td>${employee.employeeName}</td></tr>
          <tr><td>Employee ID</td><td>${employee.employeeId}</td></tr>
          ${employee.designation ? `<tr><td>Designation</td><td>${employee.designation}</td></tr>` : ""}
          ${employee.department ? `<tr><td>Department</td><td>${employee.department}</td></tr>` : ""}
        </table>
      </td>
      <td style="vertical-align:top; width:50%;">
        <table class="info-table" style="border-collapse:collapse;">
          <tr><td>Pay Period</td><td>${monthName} ${year}</td></tr>
          <tr><td>Processed On</td><td>${fmtDate(data.processedAt)}</td></tr>
          <tr>
            <td>Status</td>
            <td style="color:${isPaid ? "#16a34a" : data.status === "partially_paid" ? "#ca8a04" : "#6b7280"};">
              ${data.status === "paid" ? "Paid" : data.status === "partially_paid" ? "Partially Paid" : "Pending"}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- EARNINGS & DEDUCTIONS TABLE -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
    <thead>
      <tr>
        <th style="border:1px solid #d1d5db; padding:10px 14px; text-align:left; font-size:13px; font-weight:700; color:#374151; background:#f1f5f9;" colspan="2">Earnings</th>
        <th style="border:1px solid #d1d5db; padding:10px 14px; text-align:left; font-size:13px; font-weight:700; color:#374151; background:#f1f5f9;" colspan="2">Deductions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#374151; width:25%;">Base Salary</td>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#1f2937; text-align:right; width:25%;">${fmtAmount(data.baseSalary, currency)}</td>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#374151; width:25%;">Deductions</td>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#dc2626; text-align:right; width:25%;">${data.deductions > 0 ? `- ${fmtAmount(data.deductions, currency)}` : fmtAmount(0, currency)}</td>
      </tr>
      ${data.bonus > 0 ? `
      <tr>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#374151;">Bonus</td>
        <td style="border:1px solid #d1d5db; padding:10px 14px; font-size:13px; color:#16a34a; text-align:right;">+ ${fmtAmount(data.bonus, currency)}</td>
        <td style="border:1px solid #d1d5db; padding:10px 14px;" colspan="2"></td>
      </tr>` : ""}
    </tbody>
  </table>

  <!-- TOTALS -->
  <table style="width:100%; border-collapse:collapse; margin-bottom:28px;">
    <tr>
      <td style="width:50%;"></td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#374151; background:#f9fafb; width:25%;">Gross Earnings</td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; color:#1f2937; width:25%;">${fmtAmount(data.baseSalary + data.bonus, currency)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#374151; background:#f9fafb;">Total Deductions</td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; color:#dc2626;">${fmtAmount(data.deductions, currency)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:12px 14px; text-align:right; font-size:14px; font-weight:700; color:#0f172a; background:#f1f5f9;">Net Salary</td>
      <td style="border:1px solid #d1d5db; padding:12px 14px; text-align:right; font-size:14px; font-weight:700; color:#0f172a; background:#f1f5f9;">${fmtAmount(data.netSalary, currency)}</td>
    </tr>
    ${data.status === "partially_paid" ? `
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#16a34a; background:#f9fafb;">Paid Amount</td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#16a34a;">${fmtAmount(data.paidAmount, currency)}</td>
    </tr>
    <tr>
      <td></td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#ca8a04; background:#f9fafb;">Remaining</td>
      <td style="border:1px solid #d1d5db; padding:10px 14px; text-align:right; font-size:13px; font-weight:600; color:#ca8a04;">${fmtAmount(data.remainingAmount, currency)}</td>
    </tr>` : ""}
  </table>

  <!-- NET PAY HIGHLIGHT BOX -->
  <div style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:8px; padding:20px; text-align:center; margin-bottom:32px;">
    <div style="font-size:12px; color:#4b5563; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">
      ${data.status === "partially_paid" ? "Amount Paid" : "Net Pay"}
    </div>
    <div style="font-size:28px; font-weight:700; color:#166534;">
      ${fmtAmount(data.paidAmount, currency)}
    </div>
  </div>

  <!-- PAID WATERMARK -->
  ${isPaid ? `
  <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); font-size:100px; font-weight:900; color:rgba(22,163,74,0.06); text-transform:uppercase; pointer-events:none; z-index:0;">PAID</div>` : ""}

  <!-- SPACER -->
  <div style="flex:1;"></div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #e5e7eb; padding-top:12px;">
    <div style="font-size:11px; color:#9ca3af; text-align:center; line-height:1.5;">
      This is a system-generated salary slip and does not require a signature.<br/>
      For any discrepancies, please contact the HR / Finance department of ${companyName}.
    </div>
  </div>

</div>
</body>
</html>`;
}
