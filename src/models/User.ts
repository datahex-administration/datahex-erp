import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  whatsappNumber?: string;
  pin: string; // bcrypt hashed
  role: "super_admin" | "manager" | "staff";
  companyId: Types.ObjectId;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    whatsappNumber: { type: String, trim: true },
    pin: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "manager", "staff"],
      default: "staff",
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ companyId: 1 });

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
