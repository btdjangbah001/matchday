import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  console.log(
    "Truncating matches, inventory, applications, reservations, payments, otp_codes...",
  );
  await db.execute(
    sql`TRUNCATE TABLE matches, inventory, applications, reservations, payments, otp_codes RESTART IDENTITY CASCADE`,
  );
  console.log("Kept: staff allowlist, competitions.");
  console.log("Done. Run `npm run db:seed` to repopulate.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
