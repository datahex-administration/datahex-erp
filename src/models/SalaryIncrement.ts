import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISalaryIncrement extends Document {
  employeeId: Types.ObjectId;
  companyId: Types.ObjectId;
  previousSalary: number;
  newSalary: number;
  effectiveDate: Date;
  reason?: string;
  approvedBy: Types.ObjectId;
  createdAt: Date;
}

const SalaryIncrementSchema = new Schema<ISalaryIncrement>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    previousSalary: { type: Number, required: true },
    newSalary: { type: Number, required: true },
    effectiveDate: { type: Date, required: true },
    reason: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SalaryIncrementSchema.index({ employeeId: 1 });
SalaryIncrementSchema.index({ companyId: 1 });

export default mongoose.models.SalaryIncrement ||
  mongoose.model<ISalaryIncrement>("SalaryIncrement", SalaryIncrementSchema);
