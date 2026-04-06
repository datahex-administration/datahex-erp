export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const COMMON_CURRENCIES: CurrencyOption[] = [
  { code: "INR", name: "Indian Rupee", symbol: "Rs" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "EUR" },
  { code: "GBP", name: "British Pound", symbol: "GBP" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD" },
  { code: "OMR", name: "Omani Rial", symbol: "OMR" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD" },
  { code: "SGD", name: "Singapore Dollar", symbol: "SGD" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "MYR" },
  { code: "AUD", name: "Australian Dollar", symbol: "AUD" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CAD" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZD" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "JPY", name: "Japanese Yen", symbol: "JPY" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CNY" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HKD" },
  { code: "ZAR", name: "South African Rand", symbol: "ZAR" },
];

export function extractCollectionData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

export function getEntityId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "_id" in value &&
    typeof (value as { _id?: unknown })._id === "string"
  ) {
    return (value as { _id: string })._id;
  }

  return "";
}

export function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}