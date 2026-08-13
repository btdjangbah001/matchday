import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, inventory, seasons } from "@/db/schema";
import { applyForVendor, applyForSeat } from "@/app/actions";
import { reserveForApplication, releaseForApplication } from "@/lib/orders";
import {
  catchRedirect,
  cleanupFixtures,
  createFixture,
  formData,
  testPhone,
} from "./fixtures";

const SEASON_NAME = "itest-season";

async function createSeason(capacity: number, price = 150000) {
  const [season] = await db
    .insert(seasons)
    .values({
      name: `${SEASON_NAME}-${Math.random().toString(36).slice(2, 9)}`,
      startsAt: new Date(Date.now() - 86_400_000),
      endsAt: new Date(Date.now() + 200 * 86_400_000),
    })
    .returning({ id: seasons.id });

  await db.insert(inventory).values({
    seasonId: season.id,
    type: "vendor",
    priceMinor: price,
    capacity,
    sold: 0,
  });
  return season.id;
}

async function cleanupSeasons() {
  const rows = await db.select({ id: seasons.id }).from(seasons);
  for (const s of rows) {
    const [row] = await db
      .select({ name: seasons.name })
      .from(seasons)
      .where(eq(seasons.id, s.id))
      .limit(1);
    if (row?.name.startsWith(SEASON_NAME)) {
      await db.delete(applications).where(eq(applications.seasonId, s.id));
      await db.delete(inventory).where(eq(inventory.seasonId, s.id));
      await db.delete(seasons).where(eq(seasons.id, s.id));
    }
  }
}

async function readSeasonInventory(seasonId: number) {
  const [row] = await db
    .select()
    .from(inventory)
    .where(
      and(eq(inventory.seasonId, seasonId), eq(inventory.type, "vendor")),
    )
    .limit(1);
  return row;
}

beforeAll(async () => {
  await cleanupFixtures();
  await cleanupSeasons();
});
afterAll(async () => {
  await cleanupFixtures();
  await cleanupSeasons();
});

describe("vendor applications are season scoped", () => {
  it("creates an application against the season, not a match", async () => {
    const seasonId = await createSeason(5);
    const phone = testPhone();

    const to = await catchRedirect(() =>
      applyForVendor(
        {},
        formData({
          seasonId,
          firstName: "Ama",
          lastName: "Mensah",
          vendorType: "Food",
          phone,
          network: "MTN",
        }),
      ),
    );

    const id = to.replace("/verify/", "");
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    expect(app.type).toBe("vendor");
    expect(app.seasonId).toBe(seasonId);
    expect(app.matchId).toBeNull();
    expect(app.amountMinor).toBe(150000);
    expect(app.status).toBe("pending_otp");
  });

  it("holds and returns season inventory", async () => {
    const seasonId = await createSeason(3);
    const to = await catchRedirect(() =>
      applyForVendor(
        {},
        formData({
          seasonId,
          firstName: "Kofi",
          lastName: "Owusu",
          vendorType: "Drinks",
          phone: testPhone(),
          network: "MTN",
        }),
      ),
    );
    const id = to.replace("/verify/", "");

    expect(await reserveForApplication(id)).toEqual({ priceMinor: 150000 });
    expect((await readSeasonInventory(seasonId)).sold).toBe(1);

    await releaseForApplication(id);
    expect((await readSeasonInventory(seasonId)).sold).toBe(0);
  });

  it("refuses a second pitch on the same season for one number", async () => {
    const seasonId = await createSeason(5);
    const phone = testPhone();
    const fields = {
      seasonId,
      firstName: "Ama",
      lastName: "Mensah",
      vendorType: "Food",
      phone,
      network: "MTN",
    };

    const to = await catchRedirect(() => applyForVendor({}, formData(fields)));
    const id = to.replace("/verify/", "");
    await db
      .update(applications)
      .set({ status: "awaiting_review" })
      .where(eq(applications.id, id));

    const second = await applyForVendor({}, formData(fields));
    expect(second.error).toMatch(/already has a vendor booking/i);
  });

  it("refuses when every pitch is taken", async () => {
    const seasonId = await createSeason(1);
    const first = await catchRedirect(() =>
      applyForVendor(
        {},
        formData({
          seasonId,
          firstName: "A",
          lastName: "One",
          vendorType: "Food",
          phone: testPhone(),
          network: "MTN",
        }),
      ),
    );
    await reserveForApplication(first.replace("/verify/", ""));

    const second = await applyForVendor(
      {},
      formData({
        seasonId,
        firstName: "B",
        lastName: "Two",
        vendorType: "Food",
        phone: testPhone(),
        network: "MTN",
      }),
    );
    expect(second.error).toMatch(/sold out/i);
  });

  it("rejects a vendor application with no season", async () => {
    const result = await applyForVendor(
      {},
      formData({
        firstName: "Ama",
        lastName: "Mensah",
        vendorType: "Food",
        phone: testPhone(),
        network: "MTN",
      }),
    );
    expect(result.error).toBeTruthy();
  });
});

describe("seat applications stay match scoped", () => {
  it("creates an application against the match, not a season", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 4 } });

    const to = await catchRedirect(() =>
      applyForSeat(
        {},
        formData({ matchId: f.matchId, phone: testPhone(), network: "MTN" }),
      ),
    );
    const id = to.replace("/verify/", "");
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    expect(app.matchId).toBe(f.matchId);
    expect(app.seasonId).toBeNull();
  });

  it("lets one number hold a seat and a vendor pitch at once", async () => {
    const f = await createFixture({ seat: { price: 5000, capacity: 4 } });
    const seasonId = await createSeason(5);
    const phone = testPhone();

    await catchRedirect(() =>
      applyForSeat({}, formData({ matchId: f.matchId, phone, network: "MTN" })),
    );
    const to = await catchRedirect(() =>
      applyForVendor(
        {},
        formData({
          seasonId,
          firstName: "Ama",
          lastName: "Mensah",
          vendorType: "Food",
          phone,
          network: "MTN",
        }),
      ),
    );

    expect(to).toMatch(/^\/verify\//);
  });
});
