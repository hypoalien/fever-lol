import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

import { E2E_DATABASE_URL } from "../../playwright.config";

/**
 * Prepares the end-to-end database before the suite runs.
 *
 * Its own database, created and migrated here, so a run cannot disturb
 * development data — the specs write real orders and check tickets in.
 */
export default function globalSetup(): void {
  // CI provisions Postgres as a service container and migrates it in a
  // previous step, so there is no local Docker container to drive here.
  if (process.env.E2E_SKIP_DB_SETUP === "1") {
    rmSync(".e2e", { recursive: true, force: true });
    return;
  }

  const dbName = E2E_DATABASE_URL.split("/").pop() ?? "fever_lol_e2e";

  const psql = (args: string[]) =>
    execFileSync("docker", ["exec", "fever-lol-postgres", ...args], {
      encoding: "utf8",
    });

  try {
    execFileSync("docker", ["exec", "fever-lol-postgres", "pg_isready", "-U", "fever"], {
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      "Postgres is not running. Start it with `bun run db:up` before the e2e suite."
    );
  }

  // Dropped and recreated so every run starts from a known state.
  psql(["psql", "-U", "fever", "-d", "postgres", "-c", `DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`]);
  psql(["createdb", "-U", "fever", dbName]);

  execFileSync("bunx", ["drizzle-kit", "migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });

  execFileSync("bun", ["run", "scripts/seed.ts"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });

  rmSync(".e2e", { recursive: true, force: true });
}
