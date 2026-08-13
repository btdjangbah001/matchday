import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, inventory, payments, seasons } from "@/db/schema";
import { cleanupFixtures, createFixture, testPhone } from "./fixtures";

const SEASON = "itest-checkout";

async function cleanup() {
  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.name, SEASON));
  for (const s of rows) {
    const apps = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.seasonId, s.id));
    for (const a of apps) {
      await db.delete(payments).where(eq(payments.applicationId, a.id));
    }
    await db.delete(applications).where(eq(applications.seasonId, s.id));
    await db.delete(inventory).where(eq(inventory.seasonId, s.id));
    await db.delete(seasons).where(eq(seasons.id, s.id));
  }
  await cleanupFixtures();
}

async function pendingPaymentFor(kind: "vendor" | "seat") {
  let seasonId: number | null = null;
  let matchId: number | null = null;

  if (kind === "vendor") {
    const [s] = await db
      .insert(seasons)
      .values({
        name: SEASON,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 200 * 86_400_000),
      })
      .returning({ id: seasons.id });
    seasonId = s.id;
  } else {
    const f = await createFixture({ seat: { price: 5000, capacity: 5 } });
    matchId = f.matchId;
  }

  const [app] = await db
    .insert(applications)
    .values({
      type: kind,
      matchId,
      seasonId,
      phone: testPhone(),
      amountMinor: kind === "vendor" ? 150000 : 5000,
      status: "awaiting_payment",
    })
    .returning({ id: applications.id });

  await db.insert(payments).values({
    applicationId: app.id,
    provider: "mock",
    providerRef: app.id,
    amountMinor: kind === "vendor" ? 150000 : 5000,
    status: "pending",
  });

  return app.id;
}

// The mock checkout page joins the application to its match. A vendor has no
// match, so an inner join dropped the row and the page 404'd.
async function checkoutLookup(ref: string) {
  const { matches } = await import("@/db/schema");
  const [row] = await db
    .select({
      payment: payments,
      application: applications,
      match: matches,
      season: seasons,
    })
    .from(payments)
    .innerJoin(applications, eq(payments.applicationId, applications.id))
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(eq(payments.providerRef, ref))
    .limit(1);
  return row;
}

beforeAll(cleanup);
afterAll(cleanup);

describe("mock checkout lookup", () => {
  it("finds a season-scoped vendor payment", async () => {
    const ref = await pendingPaymentFor("vendor");
    const row = await checkoutLookup(ref);

    expect(row).toBeTruthy();
    expect(row.application.type).toBe("vendor");
    expect(row.match).toBeNull();
    expect(row.season?.name).toBe(SEASON);
    expect(row.payment.amountMinor).toBe(150000);
  });

  it("still finds a match-scoped seat payment", async () => {
    const ref = await pendingPaymentFor("seat");
    const row = await checkoutLookup(ref);

    expect(row).toBeTruthy();
    expect(row.application.type).toBe("seat");
    expect(row.match).toBeTruthy();
    expect(row.season).toBeNull();
  });

  it("returns nothing for an unknown reference", async () => {
    const row = await checkoutLookup("11111111-2222-3333-4444-555555555555");
    expect(row).toBeUndefined();
  });
});
