import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProject extends Document {
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  type?: "web" | "mobile" | "design" | "marketing" | "consulting" | "other";
  status: "requirement" | "proposal" | "in_progress" | "review" | "completed" | "maintenance";
  startDate?: Date;
  deadline?: Date;
  managerId?: Types.ObjectId;
  managerUserId?: Types.ObjectId;
  team: Types.ObjectId[];
  budget?: number;
  currency: string;
  stages: Array<{
    name: string;
    status: "pending" | "in_progress" | "completed";
    startDate?: Date;
    endDate?: Date;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["web", "mobile", "design", "marketing", "consulting", "other"],
    },
    status: {
      type: String,
      enum: ["requirement", "proposal", "in_progress", "review", "completed", "maintenance"],
      default: "requirement",
    },
    startDate: { type: Date },
    deadline: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    managerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    team: [{ type: Schema.Types.ObjectId, ref: "Employee" }],
    budget: { type: Number },
    currency: { type: String, default: "INR" },
    stages: [
      {
        name: { type: String, required: true },
        status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
        startDate: Date,
        endDate: Date,
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

ProjectSchema.index({ companyId: 1 });
ProjectSchema.index({ companyId: 1, status: 1 });
ProjectSchema.index({ clientId: 1 });

export default mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
