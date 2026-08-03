import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Database client.
 *
 * Created lazily rather than at module scope, because on Cloudflare Workers
 * the Hyperdrive binding that carries the connection string only exists inside
 * a request. Everywhere else this is a no-op: the first query builds the
 * client and it is reused from then on.
 *
 * In development the client is kept on a global so Next's hot reload does not
 * open a new pool on every module reload.
 */

type Client = ReturnType<typeof postgres>;
type Db = PostgresJsDatabase<typeof schema>;

declare global {
  // eslint-disable-next-line no-var
  var __feverDb: Db | undefined;
}

/**
 * Where the connection string comes from.
 *
 * Hyperdrive first: it pools connections at the edge, which matters because
 * every Worker isolate would otherwise open its own directly to Postgres.
 * Falls back to DATABASE_URL for local development, CI, and any non-Cloudflare
 * deployment.
 */
function connectionString(): string {
  const fromBinding = hyperdriveConnectionString();
  if (fromBinding) return fromBinding;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Missing environment variable: "DATABASE_URL"');
  }
  return url;
}

/**
 * Reads the Hyperdrive binding when running on Workers.
 *
 * Guarded, because this module is also imported under plain Node by the seed
 * script, the migration runner and both test suites, where there is no
 * Cloudflare context and the call throws.
 */
function hyperdriveConnectionString(): string | null {
  try {
    return getCloudflareContext().env.HYPERDRIVE?.connectionString ?? null;
  } catch {
    return null;
  }
}

function createDb(onWorkers: boolean): Db {
  const client: Client = postgres(connectionString(), {
    // Hyperdrive and PgBouncer both reject prepared statements.
    prepare: false,
    // Hyperdrive pools on Cloudflare's side, so the isolate keeps one socket.
    max: onWorkers ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Skips the catalogue lookup postgres.js otherwise does on connect, which
    // is a wasted round trip when the schema is known.
    fetch_types: false,
  });
  return drizzle(client, { schema });
}

let instance: Db | undefined;

/**
 * On Workers a socket belongs to the request that opened it. Reusing a cached
 * client on a later request makes that request hang until the runtime kills
 * it — which is exactly what happened before this was per-request. Hyperdrive
 * keeps the real pool, so opening a fresh client here is cheap.
 */
function resolve(): Db {
  if (hyperdriveConnectionString()) {
    return createDb(true);
  }
  if (process.env.NODE_ENV !== "production") {
    return (globalThis.__feverDb ??= createDb(false));
  }
  return (instance ??= createDb(false));
}

/**
 * The Drizzle instance.
 *
 * A proxy so call sites keep using `db.select(...)` unchanged while the
 * underlying connection is still created on first use.
 */
export const db = new Proxy({} as Db, {
  get(_target, property, receiver) {
    return Reflect.get(resolve(), property, receiver);
  },
});

export type Database = Db;
export { schema };
