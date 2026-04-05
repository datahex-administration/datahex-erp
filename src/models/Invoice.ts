import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInvoice extends Document {
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  projectId?: Types.ObjectId;
  invoiceNumber: string;
  type: "project" | "service" | "advance" | "recurring";
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  taxPercent: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issueDate: Date;
  dueDate: Date;
  pdfUrl?: string;
  sentAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    invoiceNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["project", "service", "advance", "recurring"],
      default: "project",
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    pdfUrl: { type: String },
    sentAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ companyId: 1 });
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ clientId: 1 });

export default mongoose.models.Invoice ||
  mongoose.model<IInvoice>("Invoice", InvoiceSchema);
