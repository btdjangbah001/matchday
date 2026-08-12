import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applications, inventory, matches, payments } from "@/db/schema";
import type { Application, TicketType } from "@/db/schema";
import { generateCheckInCode, generateQrToken } from "@/lib/codes";
import { fixtureTitle } from "@/lib/format";
import { sendSms } from "@/lib/sms";

function baseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

/**
 * Atomically claim one unit of inventory for a match/type. Returns the price if
 * a unit was available, or null if sold out. The `sold < capacity` guard makes
 * this safe against concurrent checkouts without an explicit transaction.
 */
export async function reserveInventory(
  matchId: number,
  type: TicketType,
): Promise<{ priceMinor: number } | null> {
  const [row] = await db
    .update(inventory)
    .set({ sold: sql`${inventory.sold} + 1` })
    .where(
      and(
        eq(inventory.matchId, matchId),
        eq(inventory.type, type),
        sql`${inventory.sold} < ${inventory.capacity}`,
      ),
    )
    .returning({ priceMinor: inventory.priceMinor });

  return row ? { priceMinor: row.priceMinor } : null;
}

/** Return a previously reserved unit (e.g. abandoned checkout). */
export async function releaseInventory(
  matchId: number,
  type: TicketType,
): Promise<void> {
  await db
    .update(inventory)
    .set({ sold: sql`${inventory.sold} - 1` })
    .where(
      and(
        eq(inventory.matchId, matchId),
        eq(inventory.type, type),
        sql`${inventory.sold} > 0`,
      ),
    );
}

/**
 * Mark a payment succeeded and issue the pass. Idempotent: safe to call more
 * than once for the same provider reference (webhook retries, mock re-submits).
 */
export async function markPaymentSucceeded(
  providerRef: string,
): Promise<Application | null> {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerRef, providerRef))
    .limit(1);
  if (!payment) return null;

  if (payment.status !== "succeeded") {
    await db
      .update(payments)
      .set({ status: "succeeded" })
      .where(eq(payments.id, payment.id));
  }

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, payment.applicationId))
    .limit(1);
  if (!app) return null;

  // Already fulfilled — return as-is so the caller stays idempotent.
  if (app.status === "paid" || app.status === "checked_in") return app;

  const checkInCode = generateCheckInCode();
  const qrToken = generateQrToken();
  const [updated] = await db
    .update(applications)
    .set({
      status: "paid",
      paidAt: new Date(),
      checkInCode,
      qrToken,
    })
    .where(eq(applications.id, app.id))
    .returning();

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, updated.matchId))
    .limit(1);

  const fixture = match
    ? fixtureTitle(match.team1, match.team2)
    : "your match";
  await sendSms(
    updated.phone,
    `Payment confirmed for ${fixture}. Check-in code: ${checkInCode}. ` +
      `View your pass: ${baseUrl()}/ticket/${qrToken}`,
  );

  return updated;
}
