"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/report-error";

/**
 * Dashboard boundary. Separate from the root one so a failure in, say, the
 * orders table does not throw the organizer back out to a bare page — the
 * sidebar and navigation stay put.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "dashboard");
  }, [error]);

  return (
    <div className="grid min-h-[50vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <h2 className="text-xl font-semibold">This section failed to load</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your data is safe. Reloading this section usually clears it.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload this section
        </button>
      </div>
    </div>
  );
}
