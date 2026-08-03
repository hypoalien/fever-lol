import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  checkoutItems,
  checkouts,
  eventTimings,
  events,
  paymentConfigs,
  promoCodes,
  ticketVariants,
  venues,
  type Checkout,
} from "@/lib/db/schema";
import {
  computeTotals,
  discountFor,
  PricingError,
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
 * A stopgap, but a server-side one: the browser previously multiplied by a
 * hardcoded 86 and posted the result as the amount to charge.
 */
export const USD_INR_RATE = Number(process.env.USD_INR_RATE ?? 88);

export interface LoadedCheckout {
  checkout: Checkout;
  items: LineItem[];
  promo: PromoLike | null;
  event: {
    id: string;
    eventName: string | null;
    eventFlyer: string | null;
    description: string | null;
    status: string;
    currency: string;
    platformFeeBearer: "organizer" | "user";
    gatewayFeeBearer: "organizer" | "user";
    userId: string;
    venueId: string | null;
  };
}

export class CheckoutError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CheckoutError";
    this.status = status;
  }
}

/**
 * Create a checkout from ticket types and quantities.
 *
 * Prices come from the ticket_variants rows and are snapshotted onto the
 * checkout, so a later edit to the event cannot change what this buyer agreed
 * to pay. Nothing about price is read from the caller.
 */
export async function createCheckout(
  eventId: string,
  requested: Array<{ type: string; quantity: number }>
): Promise<string> {
  return db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId));
    if (!event) throw new CheckoutError("Event not found", 404);
    if (event.status !== "active") {
      throw new CheckoutError("This event is not on sale", 409);
    }

    const variants = await tx
      .select()
      .from(ticketVariants)
      .where(eq(ticketVariants.eventId, eventId));

    // Collapse duplicate lines so a buyer cannot split an oversized request
    // across entries to slip past the per-type availability check.
    const wanted = new Map<string, number>();
    for (const item of requested) {
      wanted.set(item.type, (wanted.get(item.type) ?? 0) + item.quantity);
    }

    const rows: Array<{ variantId: string; type: string; quantity: number; unitPriceMinor: number }> = [];
    for (const [type, quantity] of wanted) {
      const variant = variants.find((v) => v.type === type);
      if (!variant) throw new PricingError(`Unknown ticket type: "${type}"`);
      if (variant.quantityRemaining < quantity) {
        throw new PricingError(
          variant.quantityRemaining === 0
            ? `"${type}" is sold out`
            : `Only ${variant.quantityRemaining} "${type}" ticket(s) left`,
          409
        );
      }
      rows.push({
        variantId: variant.id,
        type,
        quantity,
        unitPriceMinor: variant.priceMinor,
      });
    }

    const now = new Date();
    const [checkout] = await tx
      .insert(checkouts)
      .values({
        eventId,
        organizerId: event.userId,
        currency: event.currency,
        status: "pending",
        expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MS),
      })
      .returning();

    await tx.insert(checkoutItems).values(
      rows.map((row) => ({
        checkoutId: checkout.id,
        ticketVariantId: row.variantId,
        type: row.type,
        quantity: row.quantity,
        unitPriceMinor: row.unitPriceMinor,
      }))
    );

    return checkout.id;
  });
}

/** Load a checkout with its priced lines and the event it belongs to. */
export async function loadCheckout(
  checkoutId: string
): Promise<LoadedCheckout | null> {
  const [checkout] = await db
    .select()
    .from(checkouts)
    .where(eq(checkouts.id, checkoutId));
  if (!checkout) return null;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, checkout.eventId));
  if (!event) return null;

  const itemRows = await db
    .select()
    .from(checkoutItems)
    .where(eq(checkoutItems.checkoutId, checkoutId));

  const promo = checkout.promoCodeId
    ? await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.id, checkout.promoCodeId))
        .then((rows) => rows[0] ?? null)
    : null;

  return {
    checkout,
    items: itemRows.map((row) => ({
      type: row.type,
      quantity: row.quantity,
      unitPriceMinor: row.unitPriceMinor,
      lineTotalMinor: row.unitPriceMinor * row.quantity,
    })),
    promo: promo
      ? {
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          // Stored in minor units already; discountFor expects major, so the
          // conversion happens in totalsFor below rather than here.
          minOrderValue: undefined,
        }
      : null,
    event: {
      id: event.id,
      eventName: event.eventName,
      eventFlyer: event.eventFlyer,
      description: event.description,
      status: event.status,
      currency: event.currency,
      platformFeeBearer: event.platformFeeBearer,
      gatewayFeeBearer: event.gatewayFeeBearer,
      userId: event.userId,
      venueId: event.venueId,
    },
  };
}

/**
 * Totals for a loaded checkout.
 *
 * Always recomputed — stored totals are never trusted, so the figure shown to
 * the buyer and the figure authorised at the gateway come from one code path.
 */
export function totalsFor(loaded: LoadedCheckout): OrderTotals {
  return computeTotals(loaded.items, {
    promo: loaded.promo,
    currency: loaded.checkout.currency,
    gatewayFeeBearer: loaded.event.gatewayFeeBearer,
    platformFeeBearer: loaded.event.platformFeeBearer,
  });
}

export function isExpired(checkout: Pick<Checkout, "expiresAt">): boolean {
  return checkout.expiresAt.getTime() < Date.now();
}

/** Reject a checkout that is paid, expired or empty, with the right status. */
export function assertUsable(loaded: LoadedCheckout): void {
  if (loaded.items.length === 0) {
    throw new CheckoutError("This checkout is empty", 409);
  }
  if (loaded.checkout.status === "paid") {
    throw new CheckoutError("This checkout has already been paid", 409);
  }
  if (isExpired(loaded.checkout)) {
    throw new CheckoutError("This checkout has expired", 410);
  }
}

/** Convert the buyer-facing total into the minor units the gateway charges. */
export function toGatewayAmountMinor(
  totalMinor: number,
  currency: string
): number {
  if (currency === GATEWAY_SETTLEMENT_CURRENCY) return totalMinor;
  if (currency === "USD") return Math.round(totalMinor * USD_INR_RATE);
  throw new CheckoutError(
    `No conversion configured from ${currency} to ${GATEWAY_SETTLEMENT_CURRENCY}`,
    500
  );
}

/** Apply a promo code, returning the recomputed totals. */
export async function applyPromoCode(
  loaded: LoadedCheckout,
  code: string
): Promise<{ promo: PromoLike; totals: OrderTotals } | { error: string }> {
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.eventId, loaded.event.id),
        sql`lower(${promoCodes.code}) = lower(${code})`,
        eq(promoCodes.active, true)
      )
    )
    .limit(1);

  if (!promo) return { error: "Invalid coupon code" };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { error: "This coupon has expired" };
  }
  if (
    promo.maxRedemptions !== null &&
    promo.timesRedeemed >= promo.maxRedemptions
  ) {
    return { error: "This coupon has been fully redeemed" };
  }

  const subtotal = loaded.items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
  if (subtotal < promo.minOrderMinor) {
    return { error: "This order does not meet the coupon's minimum" };
  }

  await db
    .update(checkouts)
    .set({ promoCodeId: promo.id })
    .where(eq(checkouts.id, loaded.checkout.id));

  const applied: PromoLike = {
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
  };

  return {
    promo: applied,
    totals: computeTotals(loaded.items, {
      promo: applied,
      currency: loaded.checkout.currency,
      gatewayFeeBearer: loaded.event.gatewayFeeBearer,
      platformFeeBearer: loaded.event.platformFeeBearer,
    }),
  };
}

/** Venue and gateway details for rendering the payment page. */
export async function checkoutContext(loaded: LoadedCheckout) {
  const [venue, config, timings] = await Promise.all([
    loaded.event.venueId
      ? db
          .select()
          .from(venues)
          .where(eq(venues.id, loaded.event.venueId))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({ gateway: paymentConfigs.gateway })
      .from(paymentConfigs)
      .where(eq(paymentConfigs.userId, loaded.event.userId))
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(eventTimings)
      .where(eq(eventTimings.eventId, loaded.event.id))
      .orderBy(eventTimings.startsAt),
  ]);

  return { venue, gateway: config?.gateway ?? "razorpay", timings };
}

export { discountFor };
