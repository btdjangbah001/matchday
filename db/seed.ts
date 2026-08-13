import { asc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitions, inventory, matches, seasons, staff } from "@/db/schema";
import { DEFAULT_COMPETITIONS } from "@/lib/competitions";
import { syncSchedules } from "@/lib/schedule";

// How many of the next upcoming fixtures to open for booking by default. Staff
// curate the rest from the back office — a centre only screens a handful of the
// thousands of league fixtures at a time.
const DEFAULT_SCREENED = 30;

async function main() {
  console.log("Registering default competitions...");
  await db
    .insert(competitions)
    .values(DEFAULT_COMPETITIONS)
    .onConflictDoNothing({ target: competitions.code });

  console.log("Syncing competition schedules...");
  const { synced, competitions: withData } = await syncSchedules();
  console.log(`  ${synced} fixtures across ${withData} competitions.`);

  console.log("Seeding staff allowlist...");
  await db
    .insert(staff)
    .values([
      { phone: "+233000000000", name: "Venue Admin", role: "admin" },
      { phone: "+233000000000", name: "Venue Admin", role: "admin" },
    ])
    .onConflictDoNothing({ target: staff.phone });

  console.log(`Opening the next ${DEFAULT_SCREENED} upcoming fixtures for booking...`);
  const upcoming = await db
    .select({ id: matches.id })
    .from(matches)
    .where(gte(matches.kickoff, new Date()))
    .orderBy(asc(matches.kickoff), asc(matches.id))
    .limit(DEFAULT_SCREENED);

  const rows = upcoming.flatMap(({ id }) => [
    { matchId: id, type: "seat" as const, priceMinor: 5000, capacity: 100, sold: 0 },
    { matchId: id, type: "parking" as const, priceMinor: 2000, capacity: 40, sold: 0 },
  ]);

  if (rows.length > 0) {
    await db.insert(inventory).values(rows).onConflictDoNothing();
  }
  console.log(`  seat and parking inventory set on ${upcoming.length} fixtures.`);

  console.log("Opening the current season for vendor pitches...");
  const [range] = await db
    .select({
      first: sql<Date | null>`min(${matches.kickoff})`,
      last: sql<Date | null>`max(${matches.kickoff})`,
    })
    .from(matches)
    .where(gte(matches.kickoff, new Date()));

  const startsAt = range?.first ? new Date(range.first) : new Date();
  const endsAt = range?.last
    ? new Date(range.last)
    : new Date(Date.now() + 365 * 86_400_000);
  const name = `${startsAt.getUTCFullYear()}/${String(
    endsAt.getUTCFullYear(),
  ).slice(-2)}`;

  const [season] = await db
    .insert(seasons)
    .values({ name, startsAt, endsAt })
    .onConflictDoNothing({ target: seasons.name })
    .returning({ id: seasons.id });

  const seasonId =
    season?.id ??
    (
      await db
        .select({ id: seasons.id })
        .from(seasons)
        .where(eq(seasons.name, name))
        .limit(1)
    )[0]?.id;

  if (seasonId != null) {
    await db
      .insert(inventory)
      .values({
        seasonId,
        type: "vendor",
        priceMinor: 150000,
        capacity: 20,
        sold: 0,
      })
      .onConflictDoNothing();
    console.log(`  season ${name}: 20 vendor pitches at GHS 1500.00.`);
  }

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
