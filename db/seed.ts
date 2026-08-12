import { asc, gte } from "drizzle-orm";
import { db } from "@/db";
import { inventory, matches, staff } from "@/db/schema";
import { syncSchedules } from "@/lib/schedule";

// How many of the next upcoming fixtures to open for booking by default. Staff
// curate the rest from the back office — a centre only screens a handful of the
// thousands of league fixtures at a time.
const DEFAULT_SCREENED = 30;

async function main() {
  console.log("Syncing league schedules...");
  const { synced, competitions } = await syncSchedules();
  console.log(`  ${synced} fixtures across ${competitions} competitions.`);

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
    { matchId: id, type: "vendor" as const, priceMinor: 15000, capacity: 10, sold: 0 },
  ]);

  if (rows.length > 0) {
    await db.insert(inventory).values(rows).onConflictDoNothing();
  }
  console.log(`  inventory set on ${upcoming.length} fixtures.`);

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
