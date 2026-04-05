import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEmployee extends Document {
  userId?: Types.ObjectId;
  companyId: Types.ObjectId;
  employeeId: string; // auto-generated: DTX-001
  name: string;
  email: string;
  phone?: string;
  designation: string;
  type: "director" | "staff" | "intern";
  department?: string;
  joiningDate: Date;
  endDate?: Date; // for interns / resigned
  salary: number;
  currency: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
  };
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  status: "active" | "resigned" | "terminated" | "intern_completed";
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String },
    designation: { type: String, required: true },
    type: {
      type: String,
      enum: ["director", "staff", "intern"],
      default: "staff",
    },
    department: { type: String },
    joiningDate: { type: Date, required: true },
    endDate: { type: Date },
    salary: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      accountHolder: String,
    },
    documents: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["active", "resigned", "terminated", "intern_completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

EmployeeSchema.index({ companyId: 1 });
EmployeeSchema.index({ companyId: 1, employeeId: 1 });
EmployeeSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Employee ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
