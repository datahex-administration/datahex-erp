import mongoose, { Schema, Document, Types } from "mongoose";

export interface IClient extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  contactPersonName?: string;
  address?: string;
  additionalDetails?: string;
  companyId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String },
    company: { type: String },
    contactPersonName: { type: String },
    address: { type: String },
    additionalDetails: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClientSchema.index({ companyId: 1 });

export default mongoose.models.Client ||
  mongoose.model<IClient>("Client", ClientSchema);
