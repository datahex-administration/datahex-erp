import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  companyId: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;
  module: string;
  details?: string;
  ip?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    details: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1 });

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
