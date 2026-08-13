import { describe, expect, it } from "vitest";

// Feasibility spike: can a Node test runner import the server-side modules and
// the "use server" action file, and reach the database? Deleted once the real
// suite is in place.
describe("integration harness", () => {
  it("has DATABASE_URL", () => {
    expect(process.env.DATABASE_URL).toMatch(/^postgres/);
  });

  it("can import a server-only module", async () => {
    const orders = await import("@/lib/orders");
    expect(typeof orders.reserveInventory).toBe("function");
  });

  it("can import the 'use server' action module", async () => {
    const actions = await import("@/app/actions");
    expect(typeof actions.applyForSeat).toBe("function");
  });

  it("can reach the database", async () => {
    const { db } = await import("@/db");
    const { matches } = await import("@/db/schema");
    const rows = await db.select({ id: matches.id }).from(matches).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });
});
