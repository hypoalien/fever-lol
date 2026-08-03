import type { ZodError } from "zod";

import { log } from "@/lib/log";

/**
 * Shared response helpers for route handlers.
 *
 * Every endpoint returns JSON with a consistent `error` key. Several used to
 * return bare text bodies, which meant the browser's error handling had to
 * guess at the shape.
 */

export function jsonError(
  message: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/**
 * Turn a Zod failure into a field -> messages map.
 *
 * Written by hand because `error.flatten()` is deprecated in Zod 4, and
 * `treeifyError` produces a nested shape the client does not need.
 */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export function invalidRequest(error: ZodError, message = "Invalid request") {
  return jsonError(message, 400, { fields: fieldErrors(error) });
}

/** Wrap a handler so an unexpected throw becomes a 500 instead of a crash. */
export async function handle(
  operation: () => Promise<Response>,
  context: string
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    log.exception(context, error);
    return jsonError("Internal server error", 500);
  }
}
