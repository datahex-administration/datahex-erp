import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILeaveBalance extends Document {
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  year: number;
  balances: {
    sick: { total: number; used: number; remaining: number };
    casual: { total: number; used: number; remaining: number };
    earned: { total: number; used: number; remaining: number };
  };
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    year: { type: Number, required: true },
    balances: {
      sick: {
        total: { type: Number, default: 12 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 12 },
      },
      casual: {
        total: { type: Number, default: 12 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 12 },
      },
      earned: {
        total: { type: Number, default: 15 },
        used: { type: Number, default: 0 },
        remaining: { type: Number, default: 15 },
      },
    },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });
LeaveBalanceSchema.index({ companyId: 1, year: 1 });

export default mongoose.models.LeaveBalance ||
  mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);
