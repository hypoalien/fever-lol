import "server-only";

import { PostHog } from "posthog-node";

import type { AnalyticsEvent, AnalyticsProperties } from "./events";

/**
 * Server-side product analytics.
 *
 * Money events are captured here rather than in the browser: a payment that
 * succeeded but whose client never ran (tab closed, network dropped) still has
 * to appear in the funnel.
 *
 * Everything degrades to a no-op when the key is absent, so local development
 * and self-hosted deployments do not need a PostHog account.
 */

let client: PostHog | null = null;
let initialised = false;

function posthog(): PostHog | null {
  if (initialised) return client;
  initialised = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Serverless invocations are short-lived, so don't sit on a batch.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Record a product event.
 *
 * Never throws and never blocks the caller on the network — analytics must not
 * be able to fail a checkout.
 */
export function trackServer<E extends AnalyticsEvent>(
  event: E,
  distinctId: string,
  properties: E extends keyof AnalyticsProperties
    ? AnalyticsProperties[E]
    : Record<string, never>
): void {
  const posthogClient = posthog();
  if (!posthogClient) return;

  try {
    posthogClient.capture({
      distinctId,
      event,
      properties: properties as Record<string, unknown>,
    });
  } catch (error) {
    console.warn("Could not record analytics event:", error);
  }
}

/** Flush pending events. Call before a serverless invocation ends. */
export async function flushAnalytics(): Promise<void> {
  try {
    await posthog()?.flush();
  } catch {
    // A failed flush must not surface to the caller.
  }
}
