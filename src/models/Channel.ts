import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChannel extends Document {
  companyId: Types.ObjectId;
  name: string;
  type: "group" | "direct" | "project";
  members: Types.ObjectId[];
  projectId?: Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["group", "direct", "project"], default: "group" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ChannelSchema.index({ companyId: 1, members: 1 });
ChannelSchema.index({ companyId: 1, lastMessageAt: -1 });

export default mongoose.models.Channel ||
  mongoose.model<IChannel>("Channel", ChannelSchema);
