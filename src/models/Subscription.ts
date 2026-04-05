import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISubscription extends Document {
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  name: string;
  provider: string;
  type: "server" | "gsuite" | "domain" | "cloudflare" | "ssl" | "email" | "other";
  cost: number;
  currency: string;
  frequency: "monthly" | "yearly";
  startDate: Date;
  renewalDate: Date;
  autoRenew: boolean;
  credentials?: string; // encrypted
  status: "active" | "expired" | "cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    name: { type: String, required: true, trim: true },
    provider: { type: String, required: true },
    type: {
      type: String,
      enum: ["server", "gsuite", "domain", "cloudflare", "ssl", "email", "other"],
      required: true,
    },
    cost: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    frequency: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: true },
    credentials: { type: String }, // encrypted
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ companyId: 1 });
SubscriptionSchema.index({ renewalDate: 1 });
SubscriptionSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
