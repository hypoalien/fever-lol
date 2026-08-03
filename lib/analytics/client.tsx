"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { Suspense, useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/auth-client";
import type { AnalyticsEvent, AnalyticsProperties } from "./events";

/**
 * Browser-side analytics.
 *
 * Ingest is routed through /ingest, a Next rewrite, so requests go to our own
 * origin rather than a domain most blocklists carry.
 *
 * The whole thing is inert without a key, so contributors running the project
 * locally do not send anything anywhere.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function initialise(): void {
  if (!KEY || typeof window === "undefined" || posthog.__loaded) return;

  posthog.init(KEY, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Pageviews are captured manually below: the App Router does a soft
    // navigation, which the automatic handler does not see.
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
  });
}

/** Records a pageview on every App Router navigation. */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY || !pathname) return;
    const query = searchParams?.toString();
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, searchParams]);

  return null;
}

/** Ties events to the signed-in organizer, and clears on sign-out. */
function IdentifyUser() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  useEffect(() => {
    if (!KEY) return;
    if (userId) {
      posthog.identify(userId, { email });
    } else if (posthog._isIdentified()) {
      // Otherwise the next visitor on a shared machine inherits the identity.
      posthog.reset();
    }
  }, [userId, email]);

  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(initialise, []);

  if (!KEY) return <>{children}</>;

  return (
    <Provider client={posthog}>
      {/* useSearchParams needs a Suspense boundary to avoid opting the whole
          tree out of static rendering. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <IdentifyUser />
      {children}
    </Provider>
  );
}

/** Record a product event from the browser. Safe to call without a key. */
export function track<E extends AnalyticsEvent>(
  event: E,
  properties: E extends keyof AnalyticsProperties
    ? AnalyticsProperties[E]
    : Record<string, never>
): void {
  if (!KEY) return;
  posthog.capture(event, properties as Record<string, unknown>);
}
