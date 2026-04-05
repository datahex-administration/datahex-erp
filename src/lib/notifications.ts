import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";

interface CreateNotificationInput {
  userId: string;
  companyId: string;
  type?: "info" | "warning" | "success" | "error" | "reminder";
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function createUserNotification(input: CreateNotificationInput) {
  await connectDB();

  return Notification.create({
    userId: input.userId,
    companyId: input.companyId,
    type: input.type || "info",
    title: input.title,
    message: input.message,
    data: input.data,
  });
}