import mongoose, { Schema, Document, Types } from "mongoose";

export interface IExpense extends Document {
  companyId: Types.ObjectId;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  receipt?: string;
  approvedBy?: Types.ObjectId;
  projectId?: Types.ObjectId;
  recurring?: {
    isRecurring: boolean;
    frequency: "monthly" | "yearly";
    nextDate?: Date;
  };
  type: "general" | "salary" | "subscription" | "operational";
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    date: { type: Date, required: true },
    receipt: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: { type: String, enum: ["monthly", "yearly"] },
      nextDate: { type: Date },
    },
    type: {
      type: String,
      enum: ["general", "salary", "subscription", "operational"],
      default: "general",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

ExpenseSchema.index({ companyId: 1 });
ExpenseSchema.index({ companyId: 1, date: -1 });

export default mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);
