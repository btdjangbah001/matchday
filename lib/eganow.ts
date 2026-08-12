// Eganow (egacoreapi) MoMo collection client — implemented against the
// "Eganow Developer API 2.0" Postman collection.
//
//   Token:      GET  /api/auth/token        (HTTP Basic: username/password)
//               -> { developerJwtToken, egaMerchantId, isSuccess }
//   Collection: POST /api/transactions/collection   (Bearer token + x-Auth header)
//               -> { transactionStatus, eganowReferenceNo, message }
//   Status:     POST /api/transactions/status        (Bearer token + x-Auth header)
//               -> { isSuccess, transactionStatus, referenceNo }
//
// MoMo paypartnerCode values: MTNGH, TCELGH (Telecel/Vodafone), ATGH (AirtelTigo).
import { detectNetwork, type MomoNetwork } from "@/lib/network";
import type { PaymentStatus } from "@/lib/payments";

function baseUrl(): string {
  return process.env.EGANOW_BASE_URL || "https://developer.sandbox.egacoreapi.com";
}

function credentials(): { username: string; password: string } {
  const username = process.env.EGANOW_AUTH_USERNAME;
  const password = process.env.EGANOW_AUTH_PASSWORD;
  if (!username || !password) {
    throw new Error("EGANOW_AUTH_USERNAME / EGANOW_AUTH_PASSWORD are not set");
  }
  return { username, password };
}

// x-Auth = countryCode (first 6 chars of the username, e.g. "GH0233") + base64("user:pass").
function xAuthHeader(): string {
  if (process.env.EGANOW_X_AUTH) return process.env.EGANOW_X_AUTH;
  const { username, password } = credentials();
  const countryCode = username.slice(0, 6);
  return countryCode + Buffer.from(`${username}:${password}`).toString("base64");
}

const PARTNER_BY_NETWORK: Record<MomoNetwork, string | null> = {
  MTN: "MTNGH",
  VODAFONE: "TCELGH",
  AIRTELTIGO: "ATGH",
  UNKNOWN: null,
};

// Eganow uses the local MoMo number format, e.g. "0541931750".
function toLocalMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

// --- Auth token (cached briefly; the API doesn't return an expiry) ---
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const { username, password } = credentials();
  const res = await fetch(`${baseUrl()}/api/auth/token`, {
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.developerJwtToken) {
    throw new Error(`Eganow token request failed (${res.status}): ${JSON.stringify(data)}`);
  }
  cachedToken = {
    value: data.developerJwtToken as string,
    expiresAt: Date.now() + 10 * 60 * 1000, // cache 10 minutes
  };
  return cachedToken.value;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "x-Auth": xAuthHeader(),
    "Content-Type": "application/json",
  };
}

export interface CollectionParams {
  reference: string;
  amountMinor: number;
  currency: string;
  customerPhone: string;
  customerName: string;
  /** Customer-selected network; falls back to prefix detection if absent. */
  network?: string;
  description: string;
  callbackUrl: string;
}

/**
 * Push a MoMo debit prompt to the customer's phone. Returns Eganow's reference
 * number, which is what status checks and the callback are keyed on.
 */
export async function initiateCollection(params: CollectionParams): Promise<string> {
  // Prefer the network the customer chose; fall back to prefix detection.
  const network = (params.network as MomoNetwork) || detectNetwork(params.customerPhone);
  const paypartnerCode = PARTNER_BY_NETWORK[network as MomoNetwork];
  if (!paypartnerCode) {
    throw new Error(
      `We couldn't determine the mobile money network for ${params.customerPhone}.`,
    );
  }

  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/api/transactions/collection`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      paypartnerCode,
      amount: params.amountMinor / 100,
      accountNoOrCardNoOrMSISDN: toLocalMsisdn(params.customerPhone),
      accountName: params.customerName,
      transactionId: params.reference,
      narration: params.description,
      transCurrencyIso: params.currency,
      languageId: "en",
      callback: params.callbackUrl,
      cvv: "",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.eganowReferenceNo) {
    throw new Error(`Eganow collection failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data.eganowReferenceNo as string;
}

function mapStatus(raw: unknown): PaymentStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "SUCCESSFUL") return "success";
  if (s === "FAILED" || s === "EXPIRED" || s === "CANCELLED") return "failed";
  return "pending";
}

export async function getCollectionStatus(eganowReferenceNo: string): Promise<PaymentStatus> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}/api/transactions/status`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ transactionId: eganowReferenceNo, languageId: "en" }),
  });
  const text = await res.text();
  console.log(`[eganow] status ${eganowReferenceNo} (HTTP ${res.status}): ${text.slice(0, 300)}`);
  if (!res.ok) return "pending"; // transient errors → keep waiting
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    return "pending";
  }
  return mapStatus(data.transactionstatus);
}

/**
 * Pull Eganow's reference number out of a callback body. Searches keys
 * case-insensitively (and into nested objects) since the callback shape isn't
 * documented and .NET APIs often use PascalCase.
 */
export function parseCallbackReference(payload: unknown): string | null {
  const priority = ["eganowreferenceno", "referenceno", "reference", "transactionid"];
  const found = new Map<string, string>();

  const visit = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const nk = k.toLowerCase();
      if (typeof v === "string" && v && priority.includes(nk)) {
        if (!found.has(nk)) found.set(nk, v);
      } else if (v && typeof v === "object") {
        visit(v);
      }
    }
  };
  visit(payload);

  for (const key of priority) {
    const val = found.get(key);
    if (val) return val;
  }
  return null;
}
