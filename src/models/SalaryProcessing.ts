import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISalaryProcessing extends Document {
  companyId: Types.ObjectId;
  month: number;
  year: number;
  paymentType: "full" | "partial";
  employees: Array<{
    employeeId: Types.ObjectId;
    employeeName: string;
    baseSalary: number;
    deductions: number;
    bonus: number;
    netSalary: number;
    paidAmount: number;
    remainingAmount: number;
    status: "pending" | "paid" | "partially_paid";
  }>;
  totalAmount: number;
  totalPaid: number;
  currency: string;
  processedBy: Types.ObjectId;
  processedAt: Date;
  createdAt: Date;
}

const SalaryProcessingSchema = new Schema<ISalaryProcessing>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    paymentType: { type: String, enum: ["full", "partial"], default: "full" },
    employees: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
        employeeName: { type: String, required: true },
        baseSalary: { type: Number, required: true },
        deductions: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        netSalary: { type: Number, required: true },
        paidAmount: { type: Number, required: true },
        remainingAmount: { type: Number, default: 0 },
        status: { type: String, enum: ["pending", "paid", "partially_paid"], default: "pending" },
      },
    ],
    totalAmount: { type: Number, required: true },
    totalPaid: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SalaryProcessingSchema.index({ companyId: 1, year: 1, month: 1 });

export default mongoose.models.SalaryProcessing ||
  mongoose.model<ISalaryProcessing>("SalaryProcessing", SalaryProcessingSchema);
