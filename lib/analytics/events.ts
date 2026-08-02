/**
 * The product events worth tracking.
 *
 * Kept as a closed union with typed properties rather than free-form strings,
 * so a typo becomes a compile error instead of a silently missing funnel step,
 * and so the property names stay consistent between the client and server.
 */

export const ANALYTICS_EVENTS = {
  // Organizer funnel
  signedUp: "user_signed_up",
  onboardingCompleted: "onboarding_completed",
  eventCreated: "event_created",
  eventPublished: "event_published",
  venueCreated: "venue_created",
  paymentGatewayConnected: "payment_gateway_connected",

  // Buyer funnel
  eventViewed: "event_viewed",
  checkoutStarted: "checkout_started",
  couponApplied: "coupon_applied",
  paymentStarted: "payment_started",
  paymentSucceeded: "payment_succeeded",
  paymentFailed: "payment_failed",

  // Day of the event
  ticketScanned: "ticket_scanned",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Properties each event carries. Amounts are always minor units. */
export interface AnalyticsProperties {
  [ANALYTICS_EVENTS.signedUp]: { method: "google" | "magic_link" };
  [ANALYTICS_EVENTS.onboardingCompleted]: { currency: string };
  [ANALYTICS_EVENTS.eventCreated]: { eventId: string };
  [ANALYTICS_EVENTS.eventPublished]: {
    eventId: string;
    ticketTypes: number;
    currency: string;
  };
  [ANALYTICS_EVENTS.venueCreated]: { venueId: string };
  [ANALYTICS_EVENTS.paymentGatewayConnected]: { gateway: string };
  [ANALYTICS_EVENTS.eventViewed]: { eventId: string };
  [ANALYTICS_EVENTS.checkoutStarted]: {
    eventId: string;
    checkoutId: string;
    ticketCount: number;
    subtotalMinor: number;
    currency: string;
  };
  [ANALYTICS_EVENTS.couponApplied]: {
    checkoutId: string;
    code: string;
    discountMinor: number;
  };
  [ANALYTICS_EVENTS.paymentStarted]: {
    checkoutId: string;
    amountMinor: number;
    currency: string;
  };
  [ANALYTICS_EVENTS.paymentSucceeded]: {
    checkoutId: string;
    orderId: string;
    totalMinor: number;
    currency: string;
    ticketCount: number;
  };
  [ANALYTICS_EVENTS.paymentFailed]: {
    checkoutId: string;
    reason: string;
  };
  [ANALYTICS_EVENTS.ticketScanned]: {
    eventId: string;
    outcome: "admitted" | "already_used" | "not_found";
  };
}
