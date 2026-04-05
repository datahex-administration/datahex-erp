import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeave extends Document {
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  type: "sick" | "casual" | "earned" | "unpaid";
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    type: {
      type: String,
      enum: ["sick", "casual", "earned", "unpaid"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

LeaveSchema.index({ companyId: 1 });
LeaveSchema.index({ employeeId: 1 });
LeaveSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Leave ||
  mongoose.model<ILeave>("Leave", LeaveSchema);
