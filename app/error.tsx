"use client";

import { useEffect } from "react";
import Link from "next/link";

import { reportClientError } from "@/lib/report-error";

/** Route-level boundary. Keeps the layout, replaces the page. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "route");
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">This page didn&apos;t load</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Something failed while rendering. It has been reported.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-md border border-input px-4 py-2 font-medium"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
