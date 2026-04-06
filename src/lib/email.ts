import nodemailer from "nodemailer";

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeConfigValue(value?: string | null) {
  return value?.trim() || "";
}

function normalizeRecipientList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getEmailConfig() {
  const host = normalizeConfigValue(process.env.SMTP_HOST) || "smtp.gmail.com";
  const port = Number(normalizeConfigValue(process.env.SMTP_PORT) || "587");
  const user = normalizeConfigValue(process.env.SMTP_USER);
  const pass = normalizeConfigValue(process.env.SMTP_PASS);

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    configured: Boolean(host && port && user && pass),
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export function isValidEmailAddress(value: string) {
  return EMAIL_ADDRESS_PATTERN.test(value.trim());
}

function createTransport() {
  const emailConfig = getEmailConfig();

  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });
}

function formatEmailError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("Email delivery failed");
  }

  const message = error.message.toLowerCase();
  const errorWithCode = error as Error & { code?: string };

  if (
    errorWithCode.code === "EAUTH" ||
    message.includes("invalid login") ||
    message.includes("web browser and then try again") ||
    message.includes("5.7.9")
  ) {
    return new Error(
      "Email delivery authentication failed. Update SMTP credentials or unlock the mailbox for SMTP access."
    );
  }

  if (
    message.includes("no recipients defined") ||
    message.includes("address") ||
    message.includes("recipient")
  ) {
    return new Error("Recipient email address is invalid.");
  }

  return error;
}

export async function sendEmail(options: EmailOptions) {
  const emailConfig = getEmailConfig();
  if (!emailConfig.configured) {
    throw new Error(
      "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS."
    );
  }

  const recipients = normalizeRecipientList(options.to);

  if (recipients.length === 0) {
    throw new Error("Recipient email address is required.");
  }

  if (!recipients.every(isValidEmailAddress)) {
    throw new Error("Recipient email address is invalid.");
  }

  const transporter = createTransport();

  try {
    return await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP"}" <${emailConfig.user}>`,
      to: recipients.join(", "),
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  } catch (error) {
    throw formatEmailError(error);
  }
}

export function getEmailStatus() {
  const emailConfig = getEmailConfig();

  return {
    configured: emailConfig.configured,
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
  };
}
