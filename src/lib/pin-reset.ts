import { randomInt } from "node:crypto";
import { hashPin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isValidEmailAddress, sendEmail } from "@/lib/email";
import { createUserNotification } from "@/lib/notifications";
import { isValidWhatsAppRecipient, sendWhatsAppTextMessage } from "@/lib/whatsapp";
import User from "@/models/User";

interface PinResetTarget {
  _id: string | { toString(): string };
  companyId: string | { toString(): string };
  name: string;
  email: string;
  pin: string;
  whatsappNumber?: string;
}

interface IssuePinResetOptions {
  reason?: string;
}

export function generateSixDigitPin() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export async function issuePinReset(
  target: PinResetTarget,
  options: IssuePinResetOptions = {}
) {
  await connectDB();

  const userId = target._id.toString();
  const companyId = target.companyId.toString();
  const nextPin = generateSixDigitPin();
  const nextPinHash = await hashPin(nextPin);
  const previousPinHash = target.pin;
  const deliveryChannels: string[] = [];
  const deliveryErrors: string[] = [];
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP";
  const normalizedEmail = target.email?.trim() || "";
  const normalizedWhatsappNumber = target.whatsappNumber?.trim() || "";
  const resetReason = options.reason || "A PIN reset was requested for your account.";
  const whatsappMessage = [
    `Hello ${target.name},`,
    `${resetReason}`,
    `Your new ${appName} PIN is ${nextPin}.`,
    "Use it to sign in securely.",
  ].join("\n");

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hello ${target.name},</p>
      <p>${resetReason}</p>
      <p>Your new <strong>${appName}</strong> PIN is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${nextPin}</p>
      <p>Use this PIN to sign in securely.</p>
    </div>
  `;

  await User.findByIdAndUpdate(userId, { pin: nextPinHash });

  if (normalizedWhatsappNumber) {
    if (!isValidWhatsAppRecipient(normalizedWhatsappNumber)) {
      deliveryErrors.push("Configured WhatsApp number is invalid.");
    } else {
      try {
        await sendWhatsAppTextMessage({
          recipient: normalizedWhatsappNumber,
          message: whatsappMessage,
          priority: 1,
        });
        deliveryChannels.push("whatsapp");
      } catch (error) {
        deliveryErrors.push(
          error instanceof Error ? error.message : "WhatsApp delivery failed"
        );
      }
    }
  }

  if (normalizedEmail) {
    if (!isValidEmailAddress(normalizedEmail)) {
      deliveryErrors.push("Configured email address is invalid.");
    } else {
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: `${appName} PIN reset`,
          html: emailHtml,
        });
        deliveryChannels.push("email");
      } catch (error) {
        deliveryErrors.push(
          error instanceof Error ? error.message : "Email delivery failed"
        );
      }
    }
  }

  if (deliveryChannels.length === 0) {
    await User.findByIdAndUpdate(userId, { pin: previousPinHash });
    throw new Error(deliveryErrors[0] || "No delivery channel is available for this user");
  }

  try {
    await createUserNotification({
      userId,
      companyId,
      type: "warning",
      title: "PIN reset",
      message: `A new PIN was delivered via ${deliveryChannels.join(" and ")}.`,
      data: {
        channels: deliveryChannels,
      },
    });
  } catch (error) {
    console.error("Failed to create PIN reset notification", error);
  }

  return {
    pin: nextPin,
    deliveryChannels,
    deliveryErrors,
  };
}