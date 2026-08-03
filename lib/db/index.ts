import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Database client.
 *
 * The connection is held on a global in development so Next's hot reload
 * doesn't open a new pool on every module reload — the same reason the old
 * Mongo client did it.
 */

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing environment variable: "DATABASE_URL"');
  }
  return url;
}

declare global {
  // eslint-disable-next-line no-var
  var __feverPostgres: ReturnType<typeof postgres> | undefined;
}

function createClient(): ReturnType<typeof postgres> {
  return postgres(connectionString(), {
    // Hyperdrive and PgBouncer both dislike prepared statements.
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

const client =
  process.env.NODE_ENV === "production"
    ? createClient()
    : (globalThis.__feverPostgres ??= createClient());

export const db = drizzle(client, { schema });

export type Database = typeof db;
export { schema };
