import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBugReport extends Document {
  companyId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  stepsToReproduce?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed" | "reopened";
  reportedBy: Types.ObjectId; // User who reported
  assignedTo?: Types.ObjectId; // Employee assigned to fix
  environment?: string; // e.g. "Production", "Staging", "Development"
  screenshot?: string; // base64 or URL
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BugReportSchema = new Schema<IBugReport>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    stepsToReproduce: { type: String, trim: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed", "reopened"],
      default: "open",
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee" },
    environment: { type: String, trim: true },
    screenshot: { type: String },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

BugReportSchema.index({ companyId: 1, projectId: 1 });
BugReportSchema.index({ companyId: 1, status: 1 });
BugReportSchema.index({ companyId: 1, assignedTo: 1 });
BugReportSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.BugReport ||
  mongoose.model<IBugReport>("BugReport", BugReportSchema);
