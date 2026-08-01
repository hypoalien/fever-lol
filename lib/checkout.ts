import type { Db, Document, WithId } from "mongodb";

import { isSupportedCurrency } from "@/lib/money";
import {
  computeTotals,
  type FeeBearer,
  type LineItem,
  type OrderTotals,
  type PromoLike,
} from "@/lib/pricing";

/** How long a buyer has to complete payment before the held cart lapses. */
export const CHECKOUT_TTL_MS = 15 * 60 * 1000;

/** Razorpay settles in INR only. */
export const GATEWAY_SETTLEMENT_CURRENCY = "INR";

/**
 * Rate used to present a non-INR priced event to Razorpay.
 *
 * This is a stopgap. It lives server-side so a buyer can no longer influence
 * it — the browser previously multiplied by a hardcoded 86 and posted the
 * result as the amount to charge. A real deployment wants either a live FX
 * feed or a per-currency gateway (Stripe for USD), not a constant.
 */
export const USD_INR_RATE = Number(process.env.USD_INR_RATE ?? 88);

export interface StoredCheckout {
  _id: unknown;
  eventId: unknown;
  organizerId: unknown;
  currency: string;
  items: LineItem[];
  subtotalMinor: number;
  promo: PromoLike | null;
  status: "pending" | "paid" | "expired";
  razorpayOrderId?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * The currency an event is priced in — taken from the organizer's profile.
 * Falls back to USD, matching the client-side CurrencyProvider default.
 */
export async function resolveEventCurrency(
  db: Db,
  event: WithId<Document>
): Promise<string> {
  const organizer = await db
    .collection("users")
    .findOne({ _id: event.userId }, { projection: { currency: 1 } });

  const currency = organizer?.currency;
  return typeof currency === "string" && isSupportedCurrency(currency)
    ? currency
    : "USD";
}

/** Fee-bearer settings for an event, defaulting to the buyer paying. */
export function feeBearers(event: Document): {
  gatewayFeeBearer: FeeBearer;
  platformFeeBearer: FeeBearer;
} {
  const normalise = (v: unknown): FeeBearer =>
    v === "organizer" ? "organizer" : "user";
  return {
    gatewayFeeBearer: normalise(event.paymentGatewayFee),
    platformFeeBearer: normalise(event.platformFee),
  };
}

/** Recompute every total for a stored checkout. Never trusts stored totals. */
export function totalsForCheckout(
  checkout: Pick<StoredCheckout, "items" | "currency" | "promo">,
  event: Document
): OrderTotals {
  return computeTotals(checkout.items, {
    promo: checkout.promo,
    currency: checkout.currency,
    ...feeBearers(event),
  });
}

/**
 * Convert the buyer-facing total into the minor units Razorpay must charge.
 * Returns paise.
 */
export function toGatewayAmountMinor(
  totalMinor: number,
  currency: string
): number {
  if (currency === GATEWAY_SETTLEMENT_CURRENCY) return totalMinor;
  if (currency === "USD") return Math.round(totalMinor * USD_INR_RATE);
  throw new Error(
    `No conversion configured from ${currency} to ${GATEWAY_SETTLEMENT_CURRENCY}`
  );
}

export function isExpired(checkout: Pick<StoredCheckout, "expiresAt">): boolean {
  return new Date(checkout.expiresAt).getTime() < Date.now();
}
