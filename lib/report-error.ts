"use client";

/**
 * Reports a client-side error to PostHog.
 *
 * Errors caught by a boundary were previously only shown to the user — nothing
 * recorded that they had happened, so a broken page was invisible until
 * somebody complained.
 */
export function reportClientError(
  error: Error & { digest?: string },
  boundary: string
): void {
  try {
    const posthog = (
      globalThis as {
        posthog?: { capture: (event: string, properties: unknown) => void };
      }
    ).posthog;

    posthog?.capture("client_error", {
      boundary,
      message: error.message,
      name: error.name,
      // The digest ties this back to the server-side log line for the same
      // failure, which is the only way to correlate the two.
      digest: error.digest,
      stack: error.stack?.slice(0, 4000),
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  } catch {
    // Reporting must never throw from inside an error boundary.
  }

  console.error(`[${boundary}]`, error);
}
