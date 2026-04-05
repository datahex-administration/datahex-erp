import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createUserNotification } from "@/lib/notifications";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp";
import DailyTask from "@/models/DailyTask";
import User from "@/models/User";

function getDateRange(dateValue?: string | null) {
  const baseDate = dateValue ? new Date(dateValue) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("Invalid date");
  }

  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const body = await request.json();

  let dateRange;

  try {
    dateRange = getDateRange(body.date);
  } catch {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const targetUserId =
    body.userId && session.role !== "staff" ? body.userId : session.userId;

  const user = await User.findOne({
    _id: targetUserId,
    companyId: session.companyId,
    isActive: true,
  }).select("name email whatsappNumber companyId");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tasks = await DailyTask.find({
    companyId: session.companyId,
    userId: user._id,
    workDate: {
      $gte: dateRange.start,
      $lte: dateRange.end,
    },
  })
    .sort({ createdAt: 1 })
    .lean();

  if (tasks.length === 0) {
    return NextResponse.json({ error: "No tasks found for the selected date" }, { status: 400 });
  }

  const requestedChannels: unknown[] = Array.isArray(body.channels)
    ? body.channels
    : ["email", "whatsapp"];
  const channels = requestedChannels.filter((channel): channel is "email" | "whatsapp" =>
    channel === "email" || channel === "whatsapp"
  );

  if (channels.length === 0) {
    return NextResponse.json({ error: "Select at least one delivery channel" }, { status: 400 });
  }

  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const totalHours = tasks.reduce((sum, task) => sum + (task.durationHours || 0), 0);
  const reportDateLabel = format(dateRange.start, "dd MMM yyyy");
  const summaryLines = tasks.map((task, index) => {
    const pieces = [
      `${index + 1}. [${STATUS_LABELS[task.status] || task.status}] ${task.title}`,
    ];

    if (task.description) {
      pieces.push(` - ${task.description}`);
    }

    if (task.durationHours) {
      pieces.push(` (${task.durationHours}h)`);
    }

    return pieces.join("");
  });

  const textReport = [
    `Daily task report for ${user.name}`,
    `Date: ${reportDateLabel}`,
    `Completed: ${completedCount}/${tasks.length}`,
    totalHours > 0 ? `Tracked hours: ${totalHours}` : null,
    "",
    ...summaryLines,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlReport = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Daily task report</h2>
      <p><strong>User:</strong> ${user.name}</p>
      <p><strong>Date:</strong> ${reportDateLabel}</p>
      <p><strong>Completed:</strong> ${completedCount}/${tasks.length}</p>
      ${totalHours > 0 ? `<p><strong>Tracked hours:</strong> ${totalHours}</p>` : ""}
      <ul>
        ${tasks
          .map(
            (task) =>
              `<li><strong>${STATUS_LABELS[task.status] || task.status}</strong> - ${task.title}${task.description ? `: ${task.description}` : ""}${task.durationHours ? ` (${task.durationHours}h)` : ""}</li>`
          )
          .join("")}
      </ul>
    </div>
  `;

  const deliveredChannels: string[] = [];
  const deliveryErrors: string[] = [];

  if (channels.includes("email")) {
    if (!user.email) {
      deliveryErrors.push("User email is missing");
    } else {
      try {
        await sendEmail({
          to: user.email,
          subject: `Daily task report - ${reportDateLabel}`,
          html: htmlReport,
        });
        deliveredChannels.push("email");
      } catch (error) {
        deliveryErrors.push(error instanceof Error ? error.message : "Email delivery failed");
      }
    }
  }

  if (channels.includes("whatsapp")) {
    if (!user.whatsappNumber) {
      deliveryErrors.push("User WhatsApp number is missing");
    } else {
      try {
        await sendWhatsAppTextMessage({
          recipient: user.whatsappNumber,
          message: textReport,
          priority: 1,
        });
        deliveredChannels.push("whatsapp");
      } catch (error) {
        deliveryErrors.push(
          error instanceof Error ? error.message : "WhatsApp delivery failed"
        );
      }
    }
  }

  if (deliveredChannels.length === 0) {
    return NextResponse.json(
      { error: deliveryErrors[0] || "Task report could not be delivered" },
      { status: 503 }
    );
  }

  const reportedAt = new Date();

  await DailyTask.updateMany(
    { _id: { $in: tasks.map((task) => task._id) } },
    { $set: { lastReportedAt: reportedAt } }
  );

  try {
    await createUserNotification({
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      type: "success",
      title: "Daily report sent",
      message: `Your daily task report for ${reportDateLabel} was sent via ${deliveredChannels.join(" and ")}.`,
      data: {
        channels: deliveredChannels,
        reportDate: reportDateLabel,
      },
    });
  } catch (error) {
    console.error("Failed to create task report notification", error);
  }

  return NextResponse.json({
    success: true,
    message: `Daily task report sent via ${deliveredChannels.join(" and ")}.`,
    deliveredChannels,
    deliveryErrors,
  });
}