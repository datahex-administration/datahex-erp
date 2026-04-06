import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAttendance extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  date: Date;
  clockInTime: Date;
  clockOutTime?: Date;
  workMode: "office" | "wfh";
  totalHours?: number;
  notes?: string;
  status: "clocked_in" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    date: { type: Date, required: true },
    clockInTime: { type: Date, required: true },
    clockOutTime: { type: Date },
    workMode: {
      type: String,
      enum: ["office", "wfh"],
      required: true,
    },
    totalHours: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["clocked_in", "completed"],
      default: "clocked_in",
    },
  },
  { timestamps: true }
);

AttendanceSchema.index({ companyId: 1, userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1, date: -1 });

export default mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
