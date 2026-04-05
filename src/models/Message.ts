import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  companyId: Types.ObjectId;
  channelId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  type: "text" | "file" | "system";
  fileUrl?: string;
  fileName?: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    channelId: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "file", "system"], default: "text" },
    fileUrl: { type: String },
    fileName: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ companyId: 1 });

export default mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);
