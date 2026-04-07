import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyTask extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  description?: string;
  workDate: Date;
  status: "planned" | "in_progress" | "completed";
  durationHours?: number;
  lastReportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DailyTaskSchema = new Schema<IDailyTask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    workDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
    },
    durationHours: { type: Number, min: 0 },
    lastReportedAt: { type: Date },
  },
  { timestamps: true }
);

DailyTaskSchema.index({ companyId: 1, userId: 1, workDate: -1 });
DailyTaskSchema.index({ companyId: 1, workDate: -1 });

export default mongoose.models.DailyTask ||
  mongoose.model<IDailyTask>("DailyTask", DailyTaskSchema);