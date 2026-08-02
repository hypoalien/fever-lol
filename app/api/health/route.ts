import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { isRazorpayConfigured } from "@/lib/razorpay";

/**
 * Liveness and readiness for uptime monitoring.
 *
 * Actually queries the database rather than only confirming the process is up
 * — a Worker that cannot reach Postgres serves nothing useful, and a check
 * that returns 200 in that state is worse than no check at all.
 *
 * Deliberately terse: no version, no environment, no dependency versions. This
 * endpoint is public, so it should not describe the deployment to anyone who
 * asks.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    log.exception("Health check failed: database unreachable", error, {
      route: "api/health",
    });
    return Response.json(
      { status: "unhealthy", database: "unreachable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  return Response.json(
    {
      status: "ok",
      database: "ok",
      // Configuration state, not secrets — useful for spotting a deploy that
      // is missing its payment keys before a buyer does.
      payments: isRazorpayConfigured() ? "configured" : "not configured",
      latencyMs: Date.now() - startedAt,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
