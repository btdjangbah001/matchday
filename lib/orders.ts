import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  inventory,
  matches,
  payments,
  reservations,
} from "@/db/schema";
import type { Application, TicketType } from "@/db/schema";
import { generateCheckInCode, generateQrToken } from "@/lib/codes";
import { fixtureTitle } from "@/lib/format";
import { sendSms } from "@/lib/sms";

function baseUrl(): string {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

export const HOLD_MINUTES = 20;

async function decrementSold(inventoryId: number): Promise<void> {
  await db
    .update(inventory)
    .set({ sold: sql`${inventory.sold} - 1` })
    .where(and(eq(inventory.id, inventoryId), sql`${inventory.sold} > 0`));
}

export async function reserveForApplication(
  applicationId: string,
  matchId: number,
  type: TicketType,
): Promise<{ priceMinor: number } | null> {
  const [inv] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.matchId, matchId), eq(inventory.type, type)))
    .limit(1);
  if (!inv) return null;

  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

  const [existing] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.applicationId, applicationId))
    .limit(1);

  if (existing && existing.status !== "released") {
    await db
      .update(reservations)
      .set({ expiresAt })
      .where(eq(reservations.id, existing.id));
    return { priceMinor: inv.priceMinor };
  }

  let [claimed] = await db
    .update(inventory)
    .set({ sold: sql`${inventory.sold} + 1` })
    .where(
      and(eq(inventory.id, inv.id), sql`${inventory.sold} < ${inventory.capacity}`),
    )
    .returning({ priceMinor: inventory.priceMinor });

  if (!claimed) {
    const reclaimed = await sweepExpiredReservations();
    if (reclaimed === 0) return null;

    [claimed] = await db
      .update(inventory)
      .set({ sold: sql`${inventory.sold} + 1` })
      .where(
        and(
          eq(inventory.id, inv.id),
          sql`${inventory.sold} < ${inventory.capacity}`,
        ),
      )
      .returning({ priceMinor: inventory.priceMinor });
  }
  if (!claimed) return null;

  try {
    if (existing) {
      await db
        .update(reservations)
        .set({
          status: "held",
          inventoryId: inv.id,
          expiresAt,
          releasedAt: null,
        })
        .where(eq(reservations.id, existing.id));
    } else {
      await db
        .insert(reservations)
        .values({ applicationId, inventoryId: inv.id, expiresAt });
    }
  } catch (e) {
    await decrementSold(inv.id);
    throw e;
  }

  return { priceMinor: claimed.priceMinor };
}

export async function releaseForApplication(applicationId: string): Promise<void> {
  const [released] = await db
    .update(reservations)
    .set({ status: "released", releasedAt: new Date() })
    .where(
      and(
        eq(reservations.applicationId, applicationId),
        eq(reservations.status, "held"),
      ),
    )
    .returning({ inventoryId: reservations.inventoryId });

  if (released) await decrementSold(released.inventoryId);
}

export async function consumeReservation(applicationId: string): Promise<void> {
  await db
    .update(reservations)
    .set({ status: "consumed" })
    .where(
      and(
        eq(reservations.applicationId, applicationId),
        eq(reservations.status, "held"),
      ),
    );
}

export async function sweepExpiredReservations(): Promise<number> {
  const expired = await db
    .update(reservations)
    .set({ status: "released", releasedAt: new Date() })
    .where(
      and(
        eq(reservations.status, "held"),
        lt(reservations.expiresAt, new Date()),
      ),
    )
    .returning({
      inventoryId: reservations.inventoryId,
      applicationId: reservations.applicationId,
    });

  for (const row of expired) {
    await decrementSold(row.inventoryId);
    await db
      .update(applications)
      .set({ status: "awaiting_payment" })
      .where(
        and(
          eq(applications.id, row.applicationId),
          eq(applications.status, "awaiting_payment"),
        ),
      );
  }

  return expired.length;
}

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

  if (app.status === "paid" || app.status === "checked_in") {
    await consumeReservation(app.id);
    return app;
  }

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

  await consumeReservation(app.id);

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
