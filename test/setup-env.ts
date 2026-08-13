// Load .env for integration tests. Vitest does not read it automatically, and
// these tests talk to a real database, so DATABASE_URL must be present before
// db/index.ts is imported.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

try {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip one layer of matching quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // No .env — the integration suite will fail its own guard with a clearer message.
}

// These tests exercise the simulated payment path deliberately.
process.env.PAYMENTS_PROVIDER ??= "mock";
process.env.SMS_PROVIDER ??= "mock";
