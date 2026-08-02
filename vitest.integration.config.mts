import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Integration tests truncate between cases, so they run against their own
 * database — pointing them at the development one would wipe your seed data
 * every time you ran the suite.
 *
 * `bun run test:integration` creates and migrates it first.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://fever:fever@localhost:5433/fever_lol_test";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // One shared database, so cases must not overlap.
    fileParallelism: false,
    sequence: { concurrent: false },
    env: { DATABASE_URL: TEST_DATABASE_URL },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
