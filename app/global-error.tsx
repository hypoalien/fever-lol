"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: catches errors thrown in the root layout itself, which
 * a route-level error.tsx cannot. Replaces the whole document, so it has to
 * render its own html and body and cannot rely on any app styling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportRootError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background: "#f1f2ed",
          color: "#12151a",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "34rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#5a616b", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            The page failed to load. This has been reported. Trying again often
            works — if it doesn&apos;t, the problem is on our side.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#5a616b",
                margin: "0 0 1.5rem",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "0.7rem 1.25rem",
              border: "2px solid #12151a",
              borderRadius: 2,
              background: "#1b3fe0",
              color: "#fff",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

/**
 * Inlined rather than imported from lib/report-error: this boundary catches
 * failures in the root layout, so it has to keep working even when a shared
 * module is what broke.
 */
function reportRootError(error: Error & { digest?: string }): void {
  try {
    const posthog = (
      globalThis as { posthog?: { capture: (e: string, p: unknown) => void } }
    ).posthog;
    posthog?.capture("client_error", {
      boundary: "global",
      message: error.message,
      digest: error.digest,
      stack: error.stack?.slice(0, 4000),
    });
  } catch {
    // Reporting must never throw from inside an error boundary.
  }
  console.error("[global]", error);
}
