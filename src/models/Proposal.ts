import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProposal extends Document {
  projectId: Types.ObjectId;
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  title: string;
  content: string;
  sections: Array<{
    heading: string;
    body: string;
    order: number;
  }>;
  amount: number;
  currency: string;
  validUntil?: Date;
  status: "draft" | "sent" | "accepted" | "rejected";
  sentAt?: Date;
  respondedAt?: Date;
  pdfUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalSchema = new Schema<IProposal>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    sections: [
      {
        heading: { type: String, required: true },
        body: { type: String, default: "" },
        order: { type: Number, default: 0 },
      },
    ],
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    validUntil: { type: Date },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      default: "draft",
    },
    sentAt: { type: Date },
    respondedAt: { type: Date },
    pdfUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

ProposalSchema.index({ companyId: 1 });
ProposalSchema.index({ projectId: 1 });
ProposalSchema.index({ clientId: 1 });

export default mongoose.models.Proposal ||
  mongoose.model<IProposal>("Proposal", ProposalSchema);
