import nodemailer from "nodemailer";

function getEmailConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    configured: Boolean(host && port && user && pass),
  };
}

const emailConfig = getEmailConfig();

const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

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

export async function sendEmail(options: EmailOptions) {
  if (!emailConfig.configured) {
    throw new Error("Email delivery is not configured");
  }

  return transporter.sendMail({
    from: `"${process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP"}" <${emailConfig.user}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}

export function getEmailStatus() {
  return {
    configured: emailConfig.configured,
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
  };
}
