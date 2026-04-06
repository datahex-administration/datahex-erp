import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  code: string;
  address?: string;
  billingAddress?: string;
  logo?: string;
  gstNumber?: string;
  foreignRegistration?: string;
  footnote?: string;
  paymentDetails?: string;
  currency: string;
  settings: {
    leavePolicy?: {
      sick: number;
      casual: number;
      earned: number;
    };
    financialYearStart?: number; // month 1-12
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    address: { type: String },
    billingAddress: { type: String },
    logo: { type: String },
    gstNumber: { type: String, trim: true },
    foreignRegistration: { type: String, trim: true },
    footnote: { type: String },
    paymentDetails: { type: String },
    currency: { type: String, default: "INR" },
    settings: {
      leavePolicy: {
        sick: { type: Number, default: 12 },
        casual: { type: Number, default: 12 },
        earned: { type: Number, default: 15 },
      },
      financialYearStart: { type: Number, default: 4 }, // April
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Company ||
  mongoose.model<ICompany>("Company", CompanySchema);
