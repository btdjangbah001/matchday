import { sql } from "drizzle-orm";
import { db } from "@/db";

// Dev-only: clear schedule + booking data so it can be re-seeded cleanly.
async function main() {
  console.log("Truncating matches, inventory, applications, payments, otp_codes...");
  await db.execute(
    sql`TRUNCATE TABLE matches, inventory, applications, payments, otp_codes, staff RESTART IDENTITY CASCADE`,
  );
  console.log("Done. Run `npm run db:seed` to repopulate.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
