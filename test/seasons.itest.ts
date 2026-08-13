import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { inventory, seasons } from "@/db/schema";
import { formData } from "./fixtures";

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

vi.mock("@/lib/session", () => ({
  requireStaff: async () => ({ id: 1, phone: "+233000000000", role: "admin" }),
  getStaffSession: async () => ({ id: 1 }),
}));

const PREFIX = "itest-season-admin";

async function cleanup() {
  const rows = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(like(seasons.name, `${PREFIX}%`));
  for (const s of rows) {
    await db.delete(inventory).where(eq(inventory.seasonId, s.id));
    await db.delete(seasons).where(eq(seasons.id, s.id));
  }
}

async function vendorRow(seasonId: number) {
  const [row] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.seasonId, seasonId), eq(inventory.type, "vendor")))
    .limit(1);
  return row;
}

beforeAll(cleanup);
afterAll(cleanup);

describe("season administration", () => {
  it("creates a season", async () => {
    const { addSeason } = await import("@/app/backoffice/actions");
    const name = `${PREFIX}-create`;

    await addSeason(
      formData({ name, startsAt: "2027-08-01", endsAt: "2028-05-31" }),
    );

    const [row] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.name, name))
      .limit(1);
    expect(row).toBeTruthy();
    expect(row.active).toBe(true);
  });

  it("puts vendor pitches on sale and prices them in minor units", async () => {
    const { addSeason, saveVendorPitch } = await import(
      "@/app/backoffice/actions"
    );
    const name = `${PREFIX}-price`;
    await addSeason(
      formData({ name, startsAt: "2027-08-01", endsAt: "2028-05-31" }),
    );
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.name, name))
      .limit(1);

    await saveVendorPitch(
      formData({ seasonId: season.id, price: "1500.00", capacity: 20 }),
    );

    const row = await vendorRow(season.id);
    expect(row.priceMinor).toBe(150000);
    expect(row.capacity).toBe(20);
    expect(row.matchId).toBeNull();
  });

  it("updates the existing pitch rather than creating a second", async () => {
    const { addSeason, saveVendorPitch } = await import(
      "@/app/backoffice/actions"
    );
    const name = `${PREFIX}-update`;
    await addSeason(
      formData({ name, startsAt: "2027-08-01", endsAt: "2028-05-31" }),
    );
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.name, name))
      .limit(1);

    await saveVendorPitch(
      formData({ seasonId: season.id, price: "1500", capacity: 20 }),
    );
    await saveVendorPitch(
      formData({ seasonId: season.id, price: "2000", capacity: 25 }),
    );

    const all = await db
      .select()
      .from(inventory)
      .where(
        and(eq(inventory.seasonId, season.id), eq(inventory.type, "vendor")),
      );
    expect(all).toHaveLength(1);
    expect(all[0].priceMinor).toBe(200000);
    expect(all[0].capacity).toBe(25);
  });

  it("keeps sold counts when the price changes", async () => {
    const { addSeason, saveVendorPitch } = await import(
      "@/app/backoffice/actions"
    );
    const name = `${PREFIX}-sold`;
    await addSeason(
      formData({ name, startsAt: "2027-08-01", endsAt: "2028-05-31" }),
    );
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.name, name))
      .limit(1);

    await saveVendorPitch(
      formData({ seasonId: season.id, price: "1500", capacity: 20 }),
    );
    const before = await vendorRow(season.id);
    await db
      .update(inventory)
      .set({ sold: 3 })
      .where(eq(inventory.id, before.id));

    await saveVendorPitch(
      formData({ seasonId: season.id, price: "1800", capacity: 20 }),
    );

    const after = await vendorRow(season.id);
    expect(after.sold).toBe(3);
    expect(after.priceMinor).toBe(180000);
  });

  it("no longer accepts vendor as a per-match ticket type", async () => {
    const { saveInventory } = await import("@/app/backoffice/actions");
    await expect(
      saveInventory(
        formData({ matchId: 1, type: "vendor", price: "150", capacity: 5 }),
      ),
    ).rejects.toThrow();
  });
});
