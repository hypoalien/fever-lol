import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // These share one database, so they must not run concurrently — each
    // truncates between cases.
    fileParallelism: false,
    sequence: { concurrent: false },
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://fever:fever@localhost:5433/fever_lol",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
