// Setup order on TechUp's side is Bank -> Settlement -> Payment, so
// TECHUP_SETTLEMENT_ID must exist before any of this works.
import { randomUUID } from "node:crypto";
import type { PaymentStatus } from "@/lib/payments";

function baseUrl(): string {
  return process.env.TECHUP_BASE_URL || "https://api.techupstudio.com";
}

function authHeaders(): Record<string, string> {
  const apiKey = process.env.TECHUP_API_KEY;
  const projectId = process.env.TECHUP_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new Error("TECHUP_API_KEY / TECHUP_PROJECT_ID are not set");
  }
  return {
    "x-api-key": apiKey,
    "x-project-id": projectId,
    "Content-Type": "application/json",
  };
}

function mapStatus(raw: unknown): PaymentStatus {
  const s = String(raw ?? "").toLowerCase();
  if (s === "successful" || s === "refunded") return "success";
  if (["failed", "cancelled", "canceled", "refunding"].includes(s)) return "failed";
  return "pending"; // Pending, Processing, Unknown
}

export interface TechupInitiateParams {
  correlationId: string;
  amountMinor: number;
  description: string;
  customerName: string;
  customerPhone: string;
  callbackUrl: string;
}

export interface TechupInitiateResult {
  actionUrl: string;
  reference: string;
}

export async function initiatePayment(
  params: TechupInitiateParams,
): Promise<TechupInitiateResult> {
  const settlementId = process.env.TECHUP_SETTLEMENT_ID;
  if (!settlementId) throw new Error("TECHUP_SETTLEMENT_ID is not set");

  // A unique reference per attempt (TechUp references must be unique).
  const reference = `${params.correlationId}-${randomUUID().slice(0, 8)}`;

  const body = {
    reference,
    amount: params.amountMinor / 100,
    settlementId,
    provider: process.env.TECHUP_PROVIDER || "Hubtel",
    channel: process.env.TECHUP_CHANNEL || "Provider",
    type: "Receive",
    description: params.description,
    payeeDetails: {
      id: params.correlationId,
      name: params.customerName,
      phoneNumber: params.customerPhone.replace(/^\+/, ""),
    },
    callback: {
      url: params.callbackUrl,
      method: "POST",
      headers: process.env.TECHUP_WEBHOOK_SECRET
        ? { Authorization: `Bearer ${process.env.TECHUP_WEBHOOK_SECRET}` }
        : {},
    },
  };

  const res = await fetch(`${baseUrl()}/api/payment/initiate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { actionUrl?: string; payment?: { reference?: string } };
    message?: string;
  };
  if (!res.ok || !json.data?.actionUrl) {
    throw new Error(
      `TechUp initiate failed (${res.status}): ${json.message ?? JSON.stringify(json)}`,
    );
  }
  return {
    actionUrl: json.data.actionUrl,
    reference: json.data.payment?.reference ?? reference,
  };
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatus> {
  const res = await fetch(
    `${baseUrl()}/api/payment/status/${encodeURIComponent(reference)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) return "pending";
  const json = (await res.json().catch(() => ({}))) as {
    data?: { status?: unknown; payment?: { status?: unknown } };
  };
  const status = json.data?.status ?? json.data?.payment?.status;
  return mapStatus(status);
}

export function parseCallback(body: unknown): {
  reference: string | null;
  status: PaymentStatus;
} {
  const dto = (body as { callback?: Record<string, unknown> })?.callback ?? {};
  const reference = typeof dto.reference === "string" ? dto.reference : null;
  return { reference, status: mapStatus(dto.status) };
}
