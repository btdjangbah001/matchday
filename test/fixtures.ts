import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  inventory,
  matches,
  otpCodes,
  payments,
} from "@/db/schema";
import type { TicketType } from "@/db/schema";

// These tests run against the development database, so isolation is by
// convention: every fixture match carries this prefix and cleanup only ever
// deletes rows reachable from one.
export const FIXTURE_PREFIX = "itest-";

// +2339... is not an allocated Ghanaian range, so it cannot collide with a
// real number, and it satisfies the +233 plus nine digits format.
export function testPhone(): string {
  const n = Math.floor(Math.random() * 100_000_000)
    .toString()
    .padStart(8, "0");
  return `+2339${n}`;
}

export interface Fixture {
  matchId: number;
  extId: string;
  kickoff: Date;
}

export async function createFixture(opts?: {
  seat?: { price: number; capacity: number };
  parking?: { price: number; capacity: number };
  vendor?: { price: number; capacity: number };
  kickoff?: Date;
}): Promise<Fixture> {
  const extId = `${FIXTURE_PREFIX}${randomUUID()}`;
  // Default puts us inside the check-in window, which opens 60 minutes out.
  const kickoff = opts?.kickoff ?? new Date(Date.now() + 10 * 60_000);

  const [match] = await db
    .insert(matches)
    .values({
      extId,
      competition: "Integration Test League",
      team1: "Test United",
      team2: "Test City",
      kickoff,
      venue: "Test Venue",
    })
    .returning({ id: matches.id });

  const rows: {
    matchId: number;
    type: TicketType;
    priceMinor: number;
    capacity: number;
  }[] = [];

  const seat = opts?.seat ?? { price: 5000, capacity: 10 };
  rows.push({
    matchId: match.id,
    type: "seat",
    priceMinor: seat.price,
    capacity: seat.capacity,
  });

  if (opts?.parking) {
    rows.push({
      matchId: match.id,
      type: "parking",
      priceMinor: opts.parking.price,
      capacity: opts.parking.capacity,
    });
  }
  if (opts?.vendor) {
    rows.push({
      matchId: match.id,
      type: "vendor",
      priceMinor: opts.vendor.price,
      capacity: opts.vendor.capacity,
    });
  }

  await db.insert(inventory).values(rows);
  return { matchId: match.id, extId, kickoff };
}

export async function readInventory(matchId: number, type: TicketType) {
  const [row] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.matchId, matchId), eq(inventory.type, type)))
    .limit(1);
  return row;
}

export async function readApplication(id: string) {
  const [row] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return row;
}

// Codes are stored only as a salted hash. Overwriting the hash with one the
// test computes lets verifyOtp run unmodified rather than being stubbed.
export async function forceOtpCode(
  applicationId: string,
  phone: string,
  code: string,
): Promise<void> {
  const pepper = process.env.SESSION_SECRET ?? "";
  const codeHash = createHash("sha256")
    .update(`${phone}:${code}:${pepper}`)
    .digest("hex");

  const [latest] = await db
    .select({ id: otpCodes.id })
    .from(otpCodes)
    .where(eq(otpCodes.applicationId, applicationId))
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!latest) throw new Error("no OTP row for application " + applicationId);
  await db.update(otpCodes).set({ codeHash }).where(eq(otpCodes.id, latest.id));
}

// Server actions signal navigation by throwing; return the destination so a
// test can read the new id out of it.
export async function catchRedirect(fn: () => Promise<unknown>): Promise<string> {
  let returned: unknown;
  try {
    returned = await fn();
  } catch (e) {
    const digest = (e as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      return digest.split(";")[2] ?? "";
    }
    throw e;
  }
  throw new Error(
    `expected a redirect, but the action returned ${JSON.stringify(returned)}`,
  );
}

export function formData(fields: Record<string, string | number>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
  return fd;
}

export async function cleanupFixtures(): Promise<void> {
  const fixtureMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(like(matches.extId, `${FIXTURE_PREFIX}%`));

  if (fixtureMatches.length === 0) return;
  const matchIds = fixtureMatches.map((m) => m.id);

  const apps = await db
    .select({ id: applications.id })
    .from(applications)
    .where(inArray(applications.matchId, matchIds));
  const appIds = apps.map((a) => a.id);

  if (appIds.length > 0) {
    await db.delete(payments).where(inArray(payments.applicationId, appIds));
    await db.delete(otpCodes).where(inArray(otpCodes.applicationId, appIds));
    await db.delete(applications).where(inArray(applications.id, appIds));
  }

  await db.delete(inventory).where(inArray(inventory.matchId, matchIds));
  await db.delete(matches).where(inArray(matches.id, matchIds));
}
