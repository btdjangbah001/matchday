import "server-only";
import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { sendSms } from "@/lib/sms";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
// Rate limit OTP requests per phone to curb SMS spam/cost abuse.
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CODES_PER_WINDOW = 5;

/** Thrown when the verification code SMS could not be delivered. */
export class OtpSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpSendError";
  }
}

type Purpose = "application" | "staff_login" | "customer_login";

function generateCode(): string {
  // 6-digit numeric code. Uses the CSPRNG, not Math.random(): possession of this
  // code is the only identity proof in the system — for customers *and* for
  // back-office staff — and V8's PRNG state is recoverable from observed output.
  // See TD-04.
  return String(randomInt(100000, 1000000));
}

function hashCode(phone: string, code: string): string {
  const pepper = process.env.SESSION_SECRET ?? "";
  return createHash("sha256").update(`${phone}:${code}:${pepper}`).digest("hex");
}

/**
 * Create and "send" an OTP. Returns the plaintext code so callers can surface it
 * in development; never expose it to clients in production.
 */
export async function issueOtp(params: {
  phone: string;
  purpose: Purpose;
  applicationId?: string;
  message?: (code: string) => string;
}): Promise<{ code: string }> {
  // Throttle repeated requests from the same number.
  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)` })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.phone, params.phone),
        gte(otpCodes.createdAt, new Date(Date.now() - RATE_WINDOW_MS)),
      ),
    );
  if (Number(recent) >= MAX_CODES_PER_WINDOW) {
    throw new OtpSendError(
      "Too many verification requests. Please wait a few minutes and try again.",
    );
  }

  const code = generateCode();
  await db.insert(otpCodes).values({
    phone: params.phone,
    codeHash: hashCode(params.phone, code),
    purpose: params.purpose,
    applicationId: params.applicationId ?? null,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  const message =
    params.message?.(code) ??
    `Your Matchday verification code is ${code}. It expires in 5 minutes.`;

  // Unlike receipts/links, a failed OTP send must surface to the user — they're
  // blocked without the code. Callers catch this and show a retry message.
  const result = await sendSms(params.phone, message);
  if (!result.ok) {
    throw new OtpSendError(
      "We couldn't send your verification code right now. Please try again in a moment.",
    );
  }

  return { code };
}

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch" };

export async function verifyOtp(params: {
  phone: string;
  code: string;
  purpose: Purpose;
  applicationId?: string;
}): Promise<VerifyResult> {
  const conditions = [
    eq(otpCodes.phone, params.phone),
    eq(otpCodes.purpose, params.purpose),
    isNull(otpCodes.consumedAt),
  ];
  if (params.applicationId) {
    conditions.push(eq(otpCodes.applicationId, params.applicationId));
  }

  const [record] = await db
    .select()
    .from(otpCodes)
    .where(and(...conditions))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!record) return { ok: false, reason: "not_found" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.codeHash !== hashCode(params.phone, params.code)) {
    await db
      .update(otpCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpCodes.id, record.id));
    return { ok: false, reason: "mismatch" };
  }

  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(eq(otpCodes.id, record.id));
  return { ok: true };
}
