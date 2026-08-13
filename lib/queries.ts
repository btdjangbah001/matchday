import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  competitions,
  inventory,
  matches,
  seasons,
} from "@/db/schema";
import type { ApplicationStatus, TicketType } from "@/db/schema";
import { isUuid } from "@/lib/uuid";

export async function getCompetitionAdminList() {
  const comps = await db
    .select()
    .from(competitions)
    .orderBy(asc(competitions.name));
  const counts = await db
    .select({
      competition: matches.competition,
      total: sql<number>`count(*)`,
      upcoming: sql<number>`count(*) filter (where ${matches.kickoff} >= now())`,
    })
    .from(matches)
    .groupBy(matches.competition);
  const byName = new Map(counts.map((c) => [c.competition, c]));

  return comps.map((c) => ({
    competition: c,
    total: Number(byName.get(c.name)?.total ?? 0),
    upcoming: Number(byName.get(c.name)?.upcoming ?? 0),
  }));
}

export async function getActiveCompetitionNames(): Promise<string[]> {
  const rows = await db
    .select({ name: competitions.name })
    .from(competitions)
    .where(eq(competitions.active, true))
    .orderBy(asc(competitions.name));
  return rows.map((r) => r.name);
}

const CONFIRMED = ["paid", "checked_in"] as const;

// A match is "upcoming" if it kicks off in the future, or its time is still TBD
// (e.g. knockout fixtures whose teams aren't decided yet).
function upcomingMatch() {
  return or(isNull(matches.kickoff), gte(matches.kickoff, new Date()));
}

export interface MatchOption {
  id: number;
  competition: string | null;
  team1: string;
  team2: string;
  round: string | null;
  groupName: string | null;
  venue: string | null;
  kickoff: Date | null;
  priceMinor: number;
  capacity: number;
  sold: number;
  remaining: number;
}

export async function getAvailableMatches(
  type: TicketType,
): Promise<MatchOption[]> {
  const rows = await db
    .select({
      id: matches.id,
      competition: matches.competition,
      team1: matches.team1,
      team2: matches.team2,
      round: matches.round,
      groupName: matches.groupName,
      venue: matches.venue,
      kickoff: matches.kickoff,
      priceMinor: inventory.priceMinor,
      capacity: inventory.capacity,
      sold: inventory.sold,
    })
    .from(inventory)
    .innerJoin(matches, eq(inventory.matchId, matches.id))
    .where(
      and(
        eq(inventory.type, type),
        gt(inventory.capacity, 0),
        isNotNull(inventory.matchId),
        upcomingMatch(),
      ),
    )
    .orderBy(asc(matches.kickoff), asc(matches.id));

  return rows.map((r) => ({ ...r, remaining: r.capacity - r.sold }));
}

export async function getVenueStats() {
  const [fixtures] = await db
    .select({
      onSale: sql<number>`count(distinct ${inventory.matchId})`,
      competitions: sql<number>`count(distinct ${matches.competition})`,
      seats: sql<number>`coalesce(max(${inventory.capacity}) filter (where ${inventory.type} = 'seat'), 0)`,
    })
    .from(inventory)
    .innerJoin(matches, eq(inventory.matchId, matches.id))
    .where(and(gt(inventory.capacity, 0), upcomingMatch()));

  const [vendor] = await db
    .select({
      priceMinor: inventory.priceMinor,
      capacity: inventory.capacity,
      sold: inventory.sold,
      seasonName: seasons.name,
    })
    .from(inventory)
    .innerJoin(seasons, eq(inventory.seasonId, seasons.id))
    .where(
      and(
        eq(inventory.type, "vendor"),
        eq(seasons.active, true),
        gte(seasons.endsAt, new Date()),
      ),
    )
    .orderBy(asc(seasons.startsAt))
    .limit(1);

  return {
    onSale: Number(fixtures?.onSale ?? 0),
    competitions: Number(fixtures?.competitions ?? 0),
    seats: Number(fixtures?.seats ?? 0),
    vendor: vendor
      ? {
          seasonName: vendor.seasonName,
          priceMinor: vendor.priceMinor,
          remaining: Math.max(vendor.capacity - vendor.sold, 0),
        }
      : null,
  };
}

export async function getAvailableSeasons() {
  const rows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      startsAt: seasons.startsAt,
      endsAt: seasons.endsAt,
      priceMinor: inventory.priceMinor,
      capacity: inventory.capacity,
      sold: inventory.sold,
    })
    .from(inventory)
    .innerJoin(seasons, eq(inventory.seasonId, seasons.id))
    .where(
      and(
        eq(inventory.type, "vendor"),
        gt(inventory.capacity, 0),
        eq(seasons.active, true),
        gte(seasons.endsAt, new Date()),
      ),
    )
    .orderBy(asc(seasons.startsAt));

  return rows.map((r) => ({ ...r, remaining: r.capacity - r.sold }));
}

export async function getScreenedMatches(limit = 8) {
  const invRows = await db
    .select()
    .from(inventory)
    .where(and(gt(inventory.capacity, 0), isNotNull(inventory.matchId)));
  const ids = [...new Set(invRows.map((i) => i.matchId!))];
  if (ids.length === 0) return [];

  const ms = await db
    .select()
    .from(matches)
    .where(and(inArray(matches.id, ids), upcomingMatch()))
    .orderBy(asc(matches.kickoff), asc(matches.id))
    .limit(limit);

  return ms.map((m) => ({
    match: m,
    inventory: invRows.filter((i) => i.matchId === m.id),
  }));
}

export async function getFixtures(opts: {
  competition?: string;
  q?: string;
  limit?: number;
}) {
  const conds = [upcomingMatch()];
  if (opts.competition) conds.push(eq(matches.competition, opts.competition));
  if (opts.q) {
    const like = `%${opts.q}%`;
    conds.push(or(ilike(matches.team1, like), ilike(matches.team2, like))!);
  }

  const ms = await db
    .select()
    .from(matches)
    .where(and(...conds))
    .orderBy(asc(matches.kickoff), asc(matches.id))
    .limit(opts.limit ?? 120);
  if (ms.length === 0) return [];

  const ids = ms.map((m) => m.id);
  const invRows = await db
    .select()
    .from(inventory)
    .where(inArray(inventory.matchId, ids));

  return ms.map((m) => ({
    match: m,
    inventory: invRows.filter((i) => i.matchId === m.id),
  }));
}

export async function getApplication(id: string) {
  if (!isUuid(id)) return null;
  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return app ?? null;
}

export async function getApplicationWithMatch(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(eq(applications.id, id))
    .limit(1);
  return row ?? null;
}

export async function getApplicationByQrToken(qrToken: string) {
  if (!isUuid(qrToken)) return null;
  const [row] = await db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(eq(applications.qrToken, qrToken))
    .limit(1);
  return row ?? null;
}

export async function getVendorsAwaitingReview() {
  return db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(
      and(
        eq(applications.type, "vendor"),
        eq(applications.status, "awaiting_review"),
      ),
    )
    .orderBy(asc(applications.createdAt));
}

export async function getDashboardCounts() {
  const [row] = await db
    .select({
      vendorsPending: sql<number>`count(*) filter (where ${applications.type} = 'vendor' and ${applications.status} = 'awaiting_review')`,
      paid: sql<number>`count(*) filter (where ${applications.status} = 'paid')`,
      checkedIn: sql<number>`count(*) filter (where ${applications.status} = 'checked_in')`,
      total: sql<number>`count(*)`,
      revenueMinor: sql<number>`coalesce(sum(${applications.amountMinor}) filter (where ${applications.status} in ('paid','checked_in')), 0)`,
    })
    .from(applications);
  return {
    vendorsPending: Number(row?.vendorsPending ?? 0),
    paid: Number(row?.paid ?? 0),
    checkedIn: Number(row?.checkedIn ?? 0),
    total: Number(row?.total ?? 0),
    revenueMinor: Number(row?.revenueMinor ?? 0),
  };
}

export async function getRevenueReport() {
  const byType = await db
    .select({
      type: applications.type,
      count: sql<number>`count(*)`,
      revenueMinor: sql<number>`coalesce(sum(${applications.amountMinor}), 0)`,
    })
    .from(applications)
    .where(inArray(applications.status, [...CONFIRMED]))
    .groupBy(applications.type);

  const rows = byType.map((r) => ({
    type: r.type,
    count: Number(r.count),
    revenueMinor: Number(r.revenueMinor),
  }));
  return {
    totalMinor: rows.reduce((s, r) => s + r.revenueMinor, 0),
    totalCount: rows.reduce((s, r) => s + r.count, 0),
    byType: rows,
  };
}

export async function getMatchBreakdown() {
  const agg = await db
    .select({
      matchId: applications.matchId,
      seats: sql<number>`count(*) filter (where ${applications.type} = 'seat')`,
      parking: sql<number>`count(*) filter (where ${applications.type} = 'parking')`,
      vendors: sql<number>`count(*) filter (where ${applications.type} = 'vendor')`,
      checkedIn: sql<number>`count(*) filter (where ${applications.status} = 'checked_in')`,
      revenueMinor: sql<number>`coalesce(sum(${applications.amountMinor}), 0)`,
    })
    .from(applications)
    .where(
      and(
        inArray(applications.status, [...CONFIRMED]),
        isNotNull(applications.matchId),
      ),
    )
    .groupBy(applications.matchId);

  if (agg.length === 0) return [];

  const ids = agg.map((a) => a.matchId!);
  const ms = await db.select().from(matches).where(inArray(matches.id, ids));
  const byId = new Map(ms.map((m) => [m.id, m]));

  return agg
    .flatMap((a) => {
      const match = byId.get(a.matchId!);
      if (!match) return [];
      return [
        {
          match,
          seats: Number(a.seats),
          parking: Number(a.parking),
          vendors: Number(a.vendors),
          checkedIn: Number(a.checkedIn),
          revenueMinor: Number(a.revenueMinor),
        },
      ];
    })
    .sort(
      (x, y) =>
        (x.match.kickoff?.getTime() ?? 0) - (y.match.kickoff?.getTime() ?? 0),
    );
}

export async function getMatchAttendees(matchId: number) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return null;

  const attendees = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.matchId, matchId),
        inArray(applications.status, [...CONFIRMED]),
      ),
    )
    .orderBy(asc(applications.type), asc(applications.createdAt));

  return { match, attendees };
}

export async function getMatchesWithInventory({
  competition,
  horizonDays = 14,
}: { competition?: string; horizonDays?: number } = {}) {
  const invRows = await db.select().from(inventory);
  const configuredIds = [...new Set(invRows.map((i) => i.matchId))].filter(
    (id): id is number => id != null,
  );
  const now = new Date();

  // A competition filter opens its whole list; unfiltered stays near-term.
  let where;
  if (competition) {
    where = and(eq(matches.competition, competition), gte(matches.kickoff, now));
  } else {
    const withinHorizon = and(
      gte(matches.kickoff, now),
      lte(matches.kickoff, new Date(now.getTime() + horizonDays * 86_400_000)),
    );
    where =
      configuredIds.length > 0
        ? or(withinHorizon, inArray(matches.id, configuredIds))
        : withinHorizon;
  }

  const matchRows = await db
    .select()
    .from(matches)
    .where(where)
    .orderBy(asc(matches.kickoff), asc(matches.id))
    .limit(500);

  return matchRows.map((m) => ({
    match: m,
    inventory: invRows.filter((i) => i.matchId === m.id),
  }));
}

export async function getRecentCheckIns(limit = 10) {
  return db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(eq(applications.status, "checked_in"))
    .orderBy(desc(applications.checkedInAt))
    .limit(limit);
}

export async function getReviewedVendors() {
  return db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(
      and(
        eq(applications.type, "vendor"),
        inArray(applications.status, [
          "awaiting_payment",
          "approved",
          "rejected",
          "paid",
          "checked_in",
        ]),
      ),
    )
    .orderBy(asc(matches.kickoff), asc(matches.id), desc(applications.createdAt));
}

export async function getApplicationPipeline() {
  const [row] = await db
    .select({
      pendingOtp: sql<number>`count(*) filter (where ${applications.status} = 'pending_otp')`,
      awaitingReview: sql<number>`count(*) filter (where ${applications.status} = 'awaiting_review')`,
      awaitingPayment: sql<number>`count(*) filter (where ${applications.status} = 'awaiting_payment')`,
      paid: sql<number>`count(*) filter (where ${applications.status} = 'paid')`,
      checkedIn: sql<number>`count(*) filter (where ${applications.status} = 'checked_in')`,
      rejected: sql<number>`count(*) filter (where ${applications.status} = 'rejected')`,
      total: sql<number>`count(*)`,
    })
    .from(applications);
  return {
    pendingOtp: Number(row?.pendingOtp ?? 0),
    awaitingReview: Number(row?.awaitingReview ?? 0),
    awaitingPayment: Number(row?.awaitingPayment ?? 0),
    paid: Number(row?.paid ?? 0),
    checkedIn: Number(row?.checkedIn ?? 0),
    rejected: Number(row?.rejected ?? 0),
    total: Number(row?.total ?? 0),
  };
}

export async function getApplicationsByPhone(phone: string) {
  return db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(eq(applications.phone, phone))
    .orderBy(desc(applications.createdAt));
}

export async function getApplicationsList(opts: {
  type?: TicketType;
  status?: ApplicationStatus;
  q?: string;
}) {
  const conds = [];
  if (opts.type) conds.push(eq(applications.type, opts.type));
  if (opts.status) conds.push(eq(applications.status, opts.status));
  if (opts.q) {
    const like = `%${opts.q}%`;
    conds.push(
      or(
        ilike(applications.phone, like),
        ilike(applications.firstName, like),
        ilike(applications.lastName, like),
        ilike(applications.checkInCode, like),
      ),
    );
  }
  return db
    .select({ application: applications, match: matches, season: seasons })
    .from(applications)
    .leftJoin(matches, eq(applications.matchId, matches.id))
    .leftJoin(seasons, eq(applications.seasonId, seasons.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(applications.createdAt))
    .limit(200);
}
