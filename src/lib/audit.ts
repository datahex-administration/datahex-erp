import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";

interface LogEntry {
  companyId: string;
  userId: string;
  action: string;
  module: string;
  details?: string;
  ip?: string;
}

export async function logAudit(entry: LogEntry) {
  try {
    await connectDB();
    await AuditLog.create(entry);
  } catch {
    // Silently fail — audit logging should never break the main flow
    console.error("Audit log failed:", entry.action, entry.module);
  }
}
