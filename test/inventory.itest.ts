import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, reservations } from "@/db/schema";
import {
  consumeReservation,
  releaseForApplication,
  reserveForApplication,
  sweepExpiredReservations,
} from "@/lib/orders";
import {
  cleanupFixtures,
  createFixture,
  readInventory,
  testPhone,
} from "./fixtures";

async function makeApplication(matchId: number, type: "seat" | "parking") {
  const [row] = await db
    .insert(applications)
    .values({
      type,
      matchId,
      phone: testPhone(),
      amountMinor: 5000,
      status: "awaiting_payment",
    })
    .returning({ id: applications.id });
  return row.id;
}

beforeAll(cleanupFixtures);
afterAll(cleanupFixtures);

describe("inventory holds", () => {
  it("claims a unit and counts it against capacity", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 3 } });
    const app = await makeApplication(f.matchId, "seat");

    const held = await reserveForApplication(app, f.matchId, "seat");

    expect(held).toEqual({ priceMinor: 5000 });
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("refuses when every unit is taken", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 1 } });
    const first = await makeApplication(f.matchId, "seat");
    const second = await makeApplication(f.matchId, "seat");

    expect(await reserveForApplication(first, f.matchId, "seat")).not.toBeNull();
    expect(await reserveForApplication(second, f.matchId, "seat")).toBeNull();
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("gives one application one unit however often checkout is restarted", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 5 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");
    await reserveForApplication(app, f.matchId, "seat");
    await reserveForApplication(app, f.matchId, "seat");

    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("lets exactly one of two concurrent checkouts take the last unit", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 1 } });
    const a = await makeApplication(f.matchId, "seat");
    const b = await makeApplication(f.matchId, "seat");

    const [ra, rb] = await Promise.all([
      reserveForApplication(a, f.matchId, "seat"),
      reserveForApplication(b, f.matchId, "seat"),
    ]);

    expect([ra, rb].filter(Boolean)).toHaveLength(1);
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });
});

describe("releasing a hold", () => {
  it("returns the unit to the pool", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 2 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");
    await releaseForApplication(app);

    expect((await readInventory(f.matchId, "seat")).sold).toBe(0);
  });

  // Regression for TD-03. The webhook and the polling path can both observe the
  // same failed payment. The old counter decremented on each observation, so
  // one customer's failure could give away a unit another customer was holding.
  // A second holder is what makes this detectable: without them the `sold > 0`
  // floor hid the double decrement.
  it("does not give away another customer's unit when one failure is seen twice", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 2 } });
    const failing = await makeApplication(f.matchId, "seat");
    const holding = await makeApplication(f.matchId, "seat");

    await reserveForApplication(failing, f.matchId, "seat");
    await reserveForApplication(holding, f.matchId, "seat");
    expect((await readInventory(f.matchId, "seat")).sold).toBe(2);

    await releaseForApplication(failing);
    await releaseForApplication(failing);
    await releaseForApplication(failing);

    // Only the failing customer's unit goes back; the other is still held.
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("survives both failure paths firing at once", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 2 } });
    const app = await makeApplication(f.matchId, "seat");
    await reserveForApplication(app, f.matchId, "seat");

    await Promise.all([
      releaseForApplication(app),
      releaseForApplication(app),
    ]);

    expect((await readInventory(f.matchId, "seat")).sold).toBe(0);
  });

  it("does not release a unit that was already paid for", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 2 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");
    await consumeReservation(app);
    await releaseForApplication(app);

    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });
});

describe("abandoned checkouts", () => {
  // Regression for TD-14. A customer who closes the payment page used to remove
  // that unit from sale permanently, because nothing observed them leaving.
  it("are swept back into the pool once the hold expires", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 1 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);

    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(reservations.applicationId, app));

    expect(await sweepExpiredReservations()).toBe(1);
    expect((await readInventory(f.matchId, "seat")).sold).toBe(0);
  });

  it("never block a later customer, even with no sweep scheduled", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 1 } });
    const abandoner = await makeApplication(f.matchId, "seat");
    const buyer = await makeApplication(f.matchId, "seat");

    await reserveForApplication(abandoner, f.matchId, "seat");
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(reservations.applicationId, abandoner));

    // No explicit sweep: reserving must reclaim the stale hold by itself.
    expect(
      await reserveForApplication(buyer, f.matchId, "seat"),
    ).not.toBeNull();
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("leaves live holds alone", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 2 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");

    expect(await sweepExpiredReservations()).toBe(0);
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });

  it("does not reclaim a paid unit", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 1 } });
    const app = await makeApplication(f.matchId, "seat");

    await reserveForApplication(app, f.matchId, "seat");
    await consumeReservation(app);
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(reservations.applicationId, app));

    expect(await sweepExpiredReservations()).toBe(0);
    expect((await readInventory(f.matchId, "seat")).sold).toBe(1);
  });
});
