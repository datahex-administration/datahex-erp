type WhatsAppPriority = 1 | 2;

type WhatsAppDocumentType = "pdf" | "xls" | "xlsx" | "doc" | "docx";

interface BaseWhatsAppMessage {
  recipient: string;
  message: string;
  priority?: WhatsAppPriority;
  shortener?: number;
}

interface TextWhatsAppMessage extends BaseWhatsAppMessage {
  type?: "text";
}

interface DocumentWhatsAppMessage extends BaseWhatsAppMessage {
  type: "document";
  documentUrl: string;
  documentName: string;
  documentType: WhatsAppDocumentType;
}

export type WhatsAppMessageOptions = TextWhatsAppMessage | DocumentWhatsAppMessage;

interface WhatsAppApiResponse<T = unknown> {
  status: number | string;
  message: string;
  data: T;
}

function getWhatsAppConfig() {
  const url =
    process.env.WHATSAPP_API_URL ||
    process.env.whatsappCampaignUrl ||
    "https://app.dxing.in/api/send/whatsapp";

  const secret = process.env.WHATSAPP_API_SECRET || process.env.whatsappCampaignAccessToken;
  const account = process.env.WHATSAPP_ACCOUNT_ID || process.env.whatsappCampaignAccount;
  const provider =
    process.env.WHATSAPP_ACCOUNT_PROVIDER || process.env.whatsappCampaignAccountProvider || null;

  return {
    url,
    secret,
    account,
    provider,
    configured: Boolean(url && secret && account),
  };
}

const whatsappConfig = getWhatsAppConfig();

export function normalizeWhatsAppRecipient(recipient: string) {
  const trimmed = recipient.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("@") || /[a-z]/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  return trimmed.replace(/\D/g, "");
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as WhatsAppApiResponse;
  } catch {
    return { status: response.status, message: text, data: false } satisfies WhatsAppApiResponse<boolean>;
  }
}

export async function sendWhatsAppMessage(options: WhatsAppMessageOptions) {
  if (!whatsappConfig.configured) {
    throw new Error("WhatsApp delivery is not configured");
  }

  const recipient = normalizeWhatsAppRecipient(options.recipient);
  if (!recipient) {
    throw new Error("WhatsApp recipient is required");
  }

  const payload: Record<string, unknown> = {
    secret: whatsappConfig.secret,
    account: whatsappConfig.account,
    recipient,
    type: options.type || "text",
    message: options.message,
    priority: options.priority ?? 2,
  };

  if (options.shortener) {
    payload.shortener = options.shortener;
  }

  if (options.type === "document") {
    payload.document_url = options.documentUrl;
    payload.document_name = options.documentName;
    payload.document_type = options.documentType;
  }

  const response = await fetch(whatsappConfig.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse(response);
  const statusCode = Number(data?.status ?? response.status);

  if (!response.ok || statusCode >= 400) {
    throw new Error(data?.message || "Failed to send WhatsApp message");
  }

  return data;
}

export async function sendWhatsAppTextMessage(options: BaseWhatsAppMessage) {
  return sendWhatsAppMessage({ ...options, type: "text" });
}

export function getWhatsAppStatus() {
  return {
    configured: whatsappConfig.configured,
    provider: whatsappConfig.provider,
    endpoint: whatsappConfig.url,
  };
}