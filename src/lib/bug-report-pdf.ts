/**
 * Generate a self-contained A4 bug report HTML.
 * Opened in a new tab for printing / saving as PDF.
 */

interface BugReportCompany {
  name?: string;
  logo?: string;
  address?: string;
  billingAddress?: string;
}

interface BugReportData {
  company: BugReportCompany;
  title: string;
  description?: string;
  stepsToReproduce?: string;
  priority: string;
  status: string;
  environment?: string;
  projectName?: string;
  assignedToName?: string;
  assignedToDesignation?: string;
  reportedByName?: string;
  reportedByEmail?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6b7280",
  medium: "#2563eb",
  high: "#ea580c",
  critical: "#dc2626",
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "#fee2e2", text: "#991b1b" },
  in_progress: { bg: "#dbeafe", text: "#1e40af" },
  resolved: { bg: "#dcfce7", text: "#166534" },
  closed: { bg: "#f3f4f6", text: "#374151" },
  reopened: { bg: "#fef9c3", text: "#854d0e" },
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateBugReportHTML(data: BugReportData): string {
  const company = data.company;
  const companyName = company.name || "Company";
  const companyAddress = company.billingAddress || company.address || "";
  const priorityColor = PRIORITY_COLORS[data.priority] || "#6b7280";
  const statusColors = STATUS_BADGE_COLORS[data.status] || STATUS_BADGE_COLORS.open;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bug Report – ${data.title}</title>
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
  }
  @media screen {
    body { background: #e5e7eb; padding: 24px 0; }
    .page {
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      border-radius: 4px;
      background: #fff;
    }
  }
  .section-title {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 4px;
  }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 6px 0; font-size: 13px; vertical-align: top; }
  .info-table td:first-child { color: #6b7280; width: 140px; }
  .info-table td:last-child { font-weight: 500; color: #1f2937; }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <table style="width:100%; margin-bottom:20px;">
    <tr>
      <td style="vertical-align:top; width:50%;">
        ${company.logo
          ? `<img src="${company.logo}" alt="${companyName}" style="max-height:48px; max-width:200px; object-fit:contain;" />`
          : ""}
        <div style="font-size:16px; font-weight:700; color:#1f2937; margin-top:4px;">${companyName}</div>
        ${companyAddress
          ? `<div style="font-size:11px; color:#6b7280; white-space:pre-line; line-height:1.4; margin-top:2px;">${companyAddress}</div>`
          : ""}
      </td>
      <td style="vertical-align:top; text-align:right;">
        <div style="font-size:24px; font-weight:700; color:#1f2937; letter-spacing:-0.5px;">Bug Report</div>
        <div style="font-size:12px; color:#6b7280; margin-top:4px;">${fmtDate(data.createdAt)}</div>
      </td>
    </tr>
  </table>

  <hr style="border:none; border-top:2px solid #1f2937; margin:0 0 24px;" />

  <!-- BUG TITLE -->
  <div style="margin-bottom:24px;">
    <h2 style="font-size:20px; font-weight:700; color:#0f172a; line-height:1.4; margin-bottom:10px;">${data.title}</h2>
    <div style="display:flex; gap:10px; align-items:center;">
      <span class="badge" style="background:${priorityColor}15; color:${priorityColor}; border:1px solid ${priorityColor}40; text-transform:capitalize;">${data.priority} Priority</span>
      <span class="badge" style="background:${statusColors.bg}; color:${statusColors.text};">${STATUS_LABELS[data.status] || data.status}</span>
      ${data.environment ? `<span class="badge" style="background:#f3f4f6; color:#374151;">🌐 ${data.environment}</span>` : ""}
    </div>
  </div>

  <!-- DETAILS TABLE -->
  <div style="margin-bottom:24px;">
    <div class="section-title">Details</div>
    <table class="info-table">
      <tr>
        <td>Project</td>
        <td>${data.projectName || "—"}</td>
      </tr>
      <tr>
        <td>Reported By</td>
        <td>${data.reportedByName || "—"}${data.reportedByEmail ? ` (${data.reportedByEmail})` : ""}</td>
      </tr>
      <tr>
        <td>Assigned To</td>
        <td>${data.assignedToName ? `${data.assignedToName}${data.assignedToDesignation ? ` – ${data.assignedToDesignation}` : ""}` : "Unassigned"}</td>
      </tr>
      <tr>
        <td>Created</td>
        <td>${fmtDate(data.createdAt)}</td>
      </tr>
      <tr>
        <td>Last Updated</td>
        <td>${fmtDate(data.updatedAt)}</td>
      </tr>
      ${data.resolvedAt ? `<tr><td>Resolved</td><td style="color:#16a34a; font-weight:600;">${fmtDate(data.resolvedAt)}</td></tr>` : ""}
      ${data.closedAt ? `<tr><td>Closed</td><td>${fmtDate(data.closedAt)}</td></tr>` : ""}
    </table>
  </div>

  <!-- DESCRIPTION -->
  ${data.description ? `
  <div style="margin-bottom:24px;">
    <div class="section-title">Description</div>
    <div style="font-size:13px; line-height:1.7; color:#374151; white-space:pre-wrap;">${data.description}</div>
  </div>` : ""}

  <!-- STEPS TO REPRODUCE -->
  ${data.stepsToReproduce ? `
  <div style="margin-bottom:24px;">
    <div class="section-title">Steps to Reproduce</div>
    <div style="font-size:13px; line-height:1.7; color:#374151; white-space:pre-wrap; background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px; padding:14px 16px;">${data.stepsToReproduce}</div>
  </div>` : ""}

  <!-- SPACER -->
  <div style="flex:1;"></div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #e5e7eb; padding-top:12px;">
    <div style="font-size:11px; color:#9ca3af; text-align:center; line-height:1.5;">
      This is a system-generated bug report from ${companyName}. For any queries, please contact the project team.
    </div>
  </div>

</div>
</body>
</html>`;
}
