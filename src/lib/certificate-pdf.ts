/**
 * Generate a self-contained A4 experience / employment certificate HTML.
 * Opened in a new tab so the user can Ctrl+P / Cmd+P to save as PDF.
 */

interface CertificateCompany {
  name?: string;
  logo?: string;
  address?: string;
  billingAddress?: string;
}

interface CertificateEmployee {
  name: string;
  employeeId: string;
  designation: string;
  department?: string;
  type: string;
  joiningDate: string;
  endDate?: string; // null → still working
  status: string;
}

export interface CertificateData {
  company: CertificateCompany;
  employee: CertificateEmployee;
}

/* ─── helpers ─── */

function fmtDateLong(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function calcExperience(from: string, to?: string): string {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" and ") : "less than a month";
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ─── main generator ─── */

export function generateCertificateHTML(data: CertificateData): string {
  const { company, employee } = data;
  const companyName = company.name || "The Company";
  const companyAddress = company.billingAddress || company.address || "";
  const isActive = employee.status === "active";
  const endDateStr = employee.endDate ? fmtDateLong(employee.endDate) : todayFormatted();
  const experience = calcExperience(employee.joiningDate, employee.endDate || undefined);

  // Choose certificate title based on current status
  const certTitle = isActive
    ? "Employment Certificate"
    : "Experience Certificate";

  // Build the body paragraph
  const tenseWork = isActive ? "has been working" : "worked";
  const tenureLine = isActive
    ? `from <strong>${fmtDateLong(employee.joiningDate)}</strong> to the present date`
    : `from <strong>${fmtDateLong(employee.joiningDate)}</strong> to <strong>${endDateStr}</strong>`;

  const closingLine = isActive
    ? `${employee.name} is currently employed with us and has shown excellent dedication and professionalism during the tenure. We wish continued success in all future endeavours.`
    : `During the tenure with us, we found ${employee.name} to be sincere, dedicated, and hardworking. We wish all the best in future endeavours.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${certTitle} – ${employee.name}</title>
<style>
  @page {
    size: A4;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 14px;
    color: #1a1a1a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 48px 60px;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 40px 56px; }
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

  <!-- ===== HEADER: Logo + Company Info ===== -->
  <div style="text-align:center; margin-bottom:8px;">
    ${company.logo
      ? `<img src="${company.logo}" alt="${companyName}" style="max-height:60px; max-width:240px; object-fit:contain; margin-bottom:8px;" />`
      : ""}
    <div style="font-size:22px; font-weight:700; color:#1a1a1a; letter-spacing:0.5px;">${companyName}</div>
    ${companyAddress
      ? `<div style="font-size:12px; color:#555; margin-top:4px; white-space:pre-line; line-height:1.5;">${companyAddress}</div>`
      : ""}
  </div>

  <!-- ===== DIVIDER ===== -->
  <hr style="border:none; border-top:2px solid #1a1a1a; margin:16px 0 36px;" />

  <!-- ===== CERTIFICATE TITLE ===== -->
  <div style="text-align:center; margin-bottom:12px;">
    <div style="font-size:26px; font-weight:700; color:#1a1a1a; text-decoration:underline; text-underline-offset:6px; letter-spacing:1px;">
      ${certTitle.toUpperCase()}
    </div>
  </div>

  <!-- ===== REFERENCE & DATE ===== -->
  <div style="display:flex; justify-content:space-between; font-size:13px; color:#444; margin-bottom:36px;">
    <div><strong>Ref:</strong> ${employee.employeeId}</div>
    <div><strong>Date:</strong> ${todayFormatted()}</div>
  </div>

  <!-- ===== BODY ===== -->
  <div style="font-size:15px; line-height:2; color:#1a1a1a; text-align:justify;">
    <p style="margin-bottom:20px;">
      To Whom It May Concern,
    </p>

    <p style="margin-bottom:20px;">
      This is to certify that <strong>${employee.name}</strong>
      (Employee ID: <strong>${employee.employeeId}</strong>)
      ${tenseWork} with <strong>${companyName}</strong> as
      <strong>${employee.designation}</strong>${employee.department ? ` in the <strong>${employee.department}</strong> department` : ""}
      ${tenureLine}.
    </p>

    <p style="margin-bottom:20px;">
      Total duration of service: <strong>${experience}</strong>.
    </p>

    <p style="margin-bottom:20px;">
      ${closingLine}
    </p>

    <p style="margin-bottom:0;">
      We hereby issue this certificate at the request of ${employee.name} for whatever purpose it may serve.
    </p>
  </div>

  <!-- ===== SPACER ===== -->
  <div style="flex:1; min-height:80px;"></div>

  <!-- ===== SIGNATURE BLOCK ===== -->
  <div style="margin-top:40px;">
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div style="width:200px; border-bottom:1px solid #1a1a1a; margin-bottom:8px;"></div>
        <div style="font-size:14px; font-weight:700; color:#1a1a1a;">Authorised Signatory</div>
        <div style="font-size:13px; color:#555;">${companyName}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px; color:#555;">Company Seal</div>
        <div style="width:100px; height:100px; border:2px dashed #ccc; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-left:auto;">
          <span style="font-size:11px; color:#bbb;">Seal</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== FOOTER ===== -->
  <div style="border-top:1px solid #ddd; padding-top:10px; margin-top:24px;">
    <div style="font-size:11px; color:#888; text-align:center;">
      This is a computer-generated document. For any verification, please contact ${companyName}.
    </div>
  </div>

</div>
</body>
</html>`;
}
