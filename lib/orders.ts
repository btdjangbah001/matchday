import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  inventory,
  matches,
  payments,
  reservations,
  seasons,
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

export function inventoryScope(app: {
  matchId: number | null;
  seasonId: number | null;
  type: TicketType;
}) {
  return and(
    app.matchId != null
      ? eq(inventory.matchId, app.matchId)
      : eq(inventory.seasonId, app.seasonId!),
    eq(inventory.type, app.type),
  );
}

export async function reserveForApplication(
  applicationId: string,
): Promise<{ priceMinor: number } | null> {
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!app) return null;

  const [inv] = await db
    .select()
    .from(inventory)
    .where(inventoryScope(app))
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

async function describeScope(app: {
  matchId: number | null;
  seasonId: number | null;
}): Promise<string> {
  if (app.matchId != null) {
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, app.matchId))
      .limit(1);
    return match ? fixtureTitle(match.team1, match.team2) : "your match";
  }
  if (app.seasonId != null) {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.id, app.seasonId))
      .limit(1);
    return season ? `the ${season.name} season` : "the season";
  }
  return "your booking";
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

  const fixture = await describeScope(updated);
  await sendSms(
    updated.phone,
    `Payment confirmed for ${fixture}. Check-in code: ${checkInCode}. ` +
      `View your pass: ${baseUrl()}/ticket/${qrToken}`,
  );

  return updated;
}
