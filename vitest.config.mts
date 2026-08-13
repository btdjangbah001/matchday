import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests target the pure logic in lib/ — parsing, normalisation, formatting
// and validation. These need no browser and no database, so the suite runs in a
// plain Node environment and stays fast enough to run on every save.
//
// The alias mirrors the "@/*" path in tsconfig.json. It is declared by hand
// rather than via vite-tsconfig-paths to keep the dependency footprint small.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "db/**/*.test.ts"],
  },
});
