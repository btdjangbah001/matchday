import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Fall back to a syntactically-valid placeholder so importing this module never
// throws (e.g. during `next build` collection). Any actual query without a real
// DATABASE_URL will fail at request time, which is the correct moment to surface it.
// Use the configured URL only if it looks like a Postgres connection string;
// otherwise fall back to a valid placeholder so importing this module never
// throws (e.g. during `next build`). Real queries still require a real URL.
const configured = process.env.DATABASE_URL;
const connectionString =
  configured && /^postgres(ql)?:\/\/.+/.test(configured)
    ? configured
    : "postgresql://user:pass@localhost/placeholder";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema, casing: "snake_case" });

export { schema };
