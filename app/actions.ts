"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applications, inventory, payments } from "@/db/schema";
import type { TicketType } from "@/db/schema";
import { issueOtp, verifyOtp } from "@/lib/otp";
import {
  markPaymentSucceeded,
  releaseInventory,
  reserveInventory,
} from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { CURRENCY, TICKET_TYPE_LABELS } from "@/lib/constants";

// Statuses that count as "already holding" this ticket type for a match. A phone
// may only have one active application per (match, type) — but can still apply
// for the other types. Abandoned (pending_otp), rejected and cancelled don't count.
const ACTIVE_STATUSES = [
  "otp_verified",
  "awaiting_review",
  "approved",
  "awaiting_payment",
  "paid",
  "checked_in",
] as const;

async function findActiveDuplicate(
  phone: string,
  matchId: number,
  type: TicketType,
  excludeId?: string,
): Promise<boolean> {
  const conds = [
    eq(applications.phone, phone),
    eq(applications.matchId, matchId),
    eq(applications.type, type),
    inArray(applications.status, [...ACTIVE_STATUSES]),
  ];
  if (excludeId) conds.push(ne(applications.id, excludeId));
  const [dup] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(...conds))
    .limit(1);
  return Boolean(dup);
}
import {
  otpInputSchema,
  parkingSchema,
  seatSchema,
  vendorSchema,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  sent?: boolean;
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check your details and try again.";
}

async function startApplication(
  type: TicketType,
  matchId: number,
  fields: {
    phone: string;
    network: string;
    firstName?: string;
    lastName?: string;
    vendorType?: string;
    carRegistration?: string;
  },
): Promise<string> {
  const [inv] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.matchId, matchId), eq(inventory.type, type)))
    .limit(1);

  if (!inv || inv.capacity <= 0) {
    throw new Error("This option is not available for the selected match.");
  }
  if (inv.sold >= inv.capacity) {
    throw new Error("Sorry, this option is sold out for the selected match.");
  }

  if (await findActiveDuplicate(fields.phone, matchId, type)) {
    throw new Error(
      `This number already has a ${TICKET_TYPE_LABELS[type].toLowerCase()} booking for this match.`,
    );
  }

  const [app] = await db
    .insert(applications)
    .values({
      type,
      matchId,
      phone: fields.phone,
      momoNetwork: fields.network,
      firstName: fields.firstName ?? null,
      lastName: fields.lastName ?? null,
      vendorType: fields.vendorType ?? null,
      carRegistration: fields.carRegistration ?? null,
      amountMinor: inv.priceMinor,
      status: "pending_otp",
    })
    .returning({ id: applications.id });

  await issueOtp({
    phone: fields.phone,
    purpose: "application",
    applicationId: app.id,
  });

  return app.id;
}

export async function applyForSeat(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = seatSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let id: string;
  try {
    id = await startApplication("seat", parsed.data.matchId, {
      phone: parsed.data.phone,
      network: parsed.data.network,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/verify/${id}`);
}

export async function applyForParking(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parkingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let id: string;
  try {
    id = await startApplication("parking", parsed.data.matchId, {
      phone: parsed.data.phone,
      network: parsed.data.network,
      carRegistration: parsed.data.carRegistration,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/verify/${id}`);
}

export async function applyForVendor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = vendorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let id: string;
  try {
    id = await startApplication("vendor", parsed.data.matchId, {
      phone: parsed.data.phone,
      network: parsed.data.network,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      vendorType: parsed.data.vendorType,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(`/verify/${id}`);
}

export async function verifyApplicationOtp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const parsedCode = otpInputSchema.safeParse(formData.get("code"));
  if (!parsedCode.success) return { error: firstError(parsedCode.error) };

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Application not found." };

  const result = await verifyOtp({
    phone: app.phone,
    code: parsedCode.data,
    purpose: "application",
    applicationId,
  });

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "No active code. Please request a new one.",
      expired: "This code has expired. Please request a new one.",
      too_many_attempts: "Too many attempts. Please request a new code.",
      mismatch: "Incorrect code. Please try again.",
    };
    return { error: messages[result.reason] };
  }

  // Guard against another active application for the same match + type slipping
  // through (e.g. two unverified attempts from the same number).
  if (
    app.status === "pending_otp" &&
    (await findActiveDuplicate(app.phone, app.matchId, app.type, applicationId))
  ) {
    await db
      .update(applications)
      .set({ status: "cancelled" })
      .where(eq(applications.id, applicationId));
    return {
      error: `This number already has a ${TICKET_TYPE_LABELS[
        app.type
      ].toLowerCase()} booking for this match.`,
    };
  }

  // Vendors go to review; seat/parking go straight to payment.
  const nextStatus = app.type === "vendor" ? "awaiting_review" : "awaiting_payment";
  await db
    .update(applications)
    .set({ status: nextStatus })
    .where(eq(applications.id, applicationId));

  redirect(`/pay/${applicationId}`);
}

export async function resendApplicationOtp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Application not found." };

  try {
    await issueOtp({
      phone: app.phone,
      purpose: "application",
      applicationId,
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  return { sent: true };
}

export async function startCheckout(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { error: "Application not found." };
  if (app.status !== "awaiting_payment") {
    redirect(`/pay/${applicationId}`);
  }

  const provider = getPaymentProvider();

  const [pending] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.applicationId, applicationId),
        eq(payments.status, "pending"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (pending) {
    // Redirect providers (mock, TechUp) stored a checkout URL — send them back
    // to it; poll providers go to the confirm/poll page.
    if (pending.checkoutUrl) redirect(pending.checkoutUrl);
    redirect(`/pay/${applicationId}/confirm`);
  }

  const reserved = await reserveInventory(app.matchId, app.type);
  if (!reserved) {
    return { error: "Sorry, this option just sold out." };
  }

  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const customerName =
    [app.firstName, app.lastName].filter(Boolean).join(" ") || "Matchday Guest";

  let result;
  try {
    result = await provider.initiate({
      reference: applicationId,
      amountMinor: app.amountMinor,
      currency: CURRENCY,
      customerPhone: app.phone,
      customerName,
      description: `Matchday ${app.type} payment`,
      callbackUrl: `${base}/api/payments/${provider.name}/webhook`,
    });
  } catch (e) {
    await releaseInventory(app.matchId, app.type);
    return { error: (e as Error).message };
  }

  await db.insert(payments).values({
    applicationId,
    provider: provider.name,
    providerRef: result.providerRef,
    checkoutUrl: result.mode === "redirect" ? result.checkoutUrl : null,
    amountMinor: app.amountMinor,
    status: "pending",
  });

  // Redirect providers (mock, TechUp) send the user to a hosted checkout; poll
  // providers push a prompt to the phone, so we route them to the confirm page
  // where we listen for the callback and let them tap "I've paid".
  if (result.mode === "redirect") {
    redirect(result.checkoutUrl);
  }
  redirect(`/pay/${applicationId}/confirm`);
}

/**
 * Check the live payment status (used by the MoMo confirm page's polling and
 * its "I've paid" button). Whichever of the callback or this check confirms the
 * payment first wins — fulfilment is idempotent.
 */
export async function pollPaymentStatus(
  applicationId: string,
): Promise<{ status: "paid" | "pending" | "failed"; qrToken?: string }> {
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return { status: "pending" };
  if ((app.status === "paid" || app.status === "checked_in") && app.qrToken) {
    return { status: "paid", qrToken: app.qrToken };
  }

  const [pending] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.applicationId, applicationId),
        eq(payments.status, "pending"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!pending) return { status: "pending" };

  const status = await getPaymentProvider().checkStatus(pending.applicationId);
  if (status === "success") {
    const updated = await markPaymentSucceeded(pending.providerRef);
    return { status: "paid", qrToken: updated?.qrToken ?? undefined };
  }
  if (status === "failed") {
    // Only the caller that wins the pending -> failed transition releases the
    // held unit. Without this the webhook and this poll could both observe the
    // same failure and decrement `sold` twice for one reservation, silently
    // overselling the fixture. See TD-03.
    const [transitioned] = await db
      .update(payments)
      .set({ status: "failed" })
      .where(and(eq(payments.id, pending.id), eq(payments.status, "pending")))
      .returning({ id: payments.id });

    if (transitioned && app.status === "awaiting_payment") {
      await releaseInventory(app.matchId, app.type);
    }
    return { status: "failed" };
  }
  return { status: "pending" };
}
