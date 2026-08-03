"use client";

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * The client cache.
 *
 * This is what makes navigation feel instant, not the transport. Every screen
 * used to refetch from scratch on mount, so moving between Orders and
 * Attendees showed a spinner every time even though the data had been fetched
 * a second earlier.
 *
 * With a cache the second visit paints immediately from what we already have
 * and revalidates behind the paint, and a hover over a nav link can fetch
 * ahead of the click so the data is usually there before the navigation
 * happens.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Long enough that moving around the dashboard never refetches, short
        // enough that a tab left open overnight does not show yesterday.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // The cache already holds an answer; refetching on every window focus
        // makes the UI flicker for no benefit.
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry an auth or validation failure — the answer will not
          // change, and retrying just delays the error the user needs to see.
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

let browserClient: QueryClient | undefined;

function getClient(): QueryClient {
  // A fresh client per request on the server; one shared client in the
  // browser, or every render would discard the cache.
  if (isServer) return makeClient();
  return (browserClient ??= makeClient());
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
