import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // drizzle-kit loads .env automatically; surface a clear error if it's missing.
  console.warn("DATABASE_URL is not set — drizzle-kit commands will fail.");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
});
