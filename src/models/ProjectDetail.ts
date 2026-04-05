import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProjectDetail extends Document {
  projectId: Types.ObjectId;
  companyId: Types.ObjectId;
  hosting?: {
    provider: string;
    url: string;
    credentials: string; // encrypted
  };
  database?: {
    type: string;
    host: string;
    credentials: string; // encrypted
  };
  gitUrls: string[];
  envFiles: string; // encrypted
  serverCost?: {
    amount: number;
    currency: string;
    frequency: "monthly" | "yearly";
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectDetailSchema = new Schema<IProjectDetail>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    hosting: {
      provider: String,
      url: String,
      credentials: String,
    },
    database: {
      type: String,
      host: String,
      credentials: String,
    },
    gitUrls: [{ type: String }],
    envFiles: { type: String },
    serverCost: {
      amount: Number,
      currency: { type: String, default: "USD" },
      frequency: { type: String, enum: ["monthly", "yearly"] },
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.ProjectDetail ||
  mongoose.model<IProjectDetail>("ProjectDetail", ProjectDetailSchema);
