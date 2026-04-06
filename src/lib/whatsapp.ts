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

function normalizeConfigValue(value?: string | null) {
  return value?.trim() || "";
}

function getWhatsAppConfig() {
  const url =
    normalizeConfigValue(process.env.WHATSAPP_API_URL) ||
    normalizeConfigValue(process.env.whatsappCampaignUrl) ||
    "https://app.dxing.in/api/send/whatsapp";

  const secret =
    normalizeConfigValue(process.env.WHATSAPP_API_SECRET) ||
    normalizeConfigValue(process.env.whatsappCampaignAccessToken);
  const account =
    normalizeConfigValue(process.env.WHATSAPP_ACCOUNT_ID) ||
    normalizeConfigValue(process.env.whatsappCampaignAccount);
  const provider =
    normalizeConfigValue(process.env.WHATSAPP_ACCOUNT_PROVIDER) ||
    normalizeConfigValue(process.env.whatsappCampaignAccountProvider) ||
    null;

  return {
    url,
    secret,
    account,
    provider,
    configured: Boolean(url && secret && account),
  };
}

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

export function isValidWhatsAppRecipient(recipient: string) {
  const normalized = normalizeWhatsAppRecipient(recipient);

  if (!normalized) {
    return false;
  }

  if (normalized.includes("@") || /[a-z]/i.test(normalized)) {
    return normalized.length >= 3;
  }

  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  return /^\d{8,15}$/.test(digits);
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

function formatWhatsAppError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("WhatsApp delivery failed");
  }

  const message = error.message.toLowerCase();

  if (message.includes("account doesn't exist") || message.includes("no whatsapp account found")) {
    return new Error(
      "WhatsApp delivery account is invalid. Update WHATSAPP_ACCOUNT_ID and WHATSAPP_ACCOUNT_PROVIDER."
    );
  }

  if (message.includes("invalid parameters")) {
    return new Error(
      "WhatsApp delivery request was rejected. Check the recipient number and provider configuration."
    );
  }

  return error;
}

export async function sendWhatsAppMessage(options: WhatsAppMessageOptions) {
  const whatsappConfig = getWhatsAppConfig();

  if (!whatsappConfig.configured) {
    throw new Error(
      "WhatsApp delivery is not configured. Set WHATSAPP_API_URL, WHATSAPP_API_SECRET, and WHATSAPP_ACCOUNT_ID."
    );
  }

  const recipient = normalizeWhatsAppRecipient(options.recipient);
  if (!recipient) {
    throw new Error("WhatsApp recipient is required");
  }

  if (!isValidWhatsAppRecipient(recipient)) {
    throw new Error("WhatsApp recipient number is invalid.");
  }

  const payload: Record<string, unknown> = {
    secret: whatsappConfig.secret,
    account: whatsappConfig.account,
    recipient,
    type: options.type || "text",
    message: options.message,
    priority: options.priority ?? 2,
  };

  if (whatsappConfig.provider) {
    payload.provider = whatsappConfig.provider;
    payload.account_provider = whatsappConfig.provider;
    payload.accountProvider = whatsappConfig.provider;
  }

  if (options.shortener) {
    payload.shortener = options.shortener;
  }

  if (options.type === "document") {
    payload.document_url = options.documentUrl;
    payload.document_name = options.documentName;
    payload.document_type = options.documentType;
  }

  try {
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
  } catch (error) {
    throw formatWhatsAppError(error);
  }
}

export async function sendWhatsAppTextMessage(options: BaseWhatsAppMessage) {
  return sendWhatsAppMessage({ ...options, type: "text" });
}

export function getWhatsAppStatus() {
  const whatsappConfig = getWhatsAppConfig();

  return {
    configured: whatsappConfig.configured,
    provider: whatsappConfig.provider,
    endpoint: whatsappConfig.url,
  };
}