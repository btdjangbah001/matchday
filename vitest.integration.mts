import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
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
    // One shared database: parallel files would race on the same inventory.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
