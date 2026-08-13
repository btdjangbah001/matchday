import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

/**
 * Integration tests. Unlike the unit suite these talk to a real Postgres and
 * drive the actual server actions, so they are slower, run sequentially, and
 * are kept in a separate config and a separate npm script.
 *
 * Run with:  npm run test:integration
 */
export default defineConfig({
  resolve: {
    alias: {
      // Next's client-bundle guard; meaningless and unresolvable under Node.
      "server-only": fileURLToPath(
        new URL("./test/server-only-stub.ts", import.meta.url),
      ),
      "@": root,
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.itest.ts"],
    setupFiles: ["./test/setup-env.ts"],
    // Every test shares one database. Running files in parallel would let them
    // race on the same inventory rows and produce failures that are artefacts
    // of the harness rather than the system.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
