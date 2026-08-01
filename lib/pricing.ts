/**
 * Authoritative, server-side pricing.
 *
 * Nothing here reads a price from the client. Callers pass the event document
 * loaded from the database plus the *quantities* the buyer asked for; every
 * unit price, fee and total is derived from the event itself. These functions
 * are pure so they can be unit-tested without a database.
 */

import { clampToZero, percentOf, toMinor } from "@/lib/money";

/** The payment gateway's cut, as a whole-number percentage. */
export const GATEWAY_FEE_PERCENT = 3;

/** Platform take rate. Zero while the launch promotion is running. */
export const PLATFORM_FEE_PERCENT = 0;

/** Who absorbs a given fee. Mirrors the values stored on the event document. */
export type FeeBearer = "organizer" | "user";

export interface TicketVariantLike {
  type: string;
  description?: string;
  /** Organizers enter this in the event form; historically a string. */
  price: string | number;
  /** Total ever released for sale. */
  quantity: string | number;
  /** Still available. May be absent on older events, in which case we fall back to `quantity`. */
  remaining?: string | number;
}

export interface EventLike {
  ticketVariants?: TicketVariantLike[];
  platformFee?: FeeBearer;
  paymentGatewayFee?: FeeBearer;
  status?: string;
}

/** What the buyer asked for. Quantities only — never prices. */
export interface RequestedItem {
  type: string;
  quantity: number;
}

/** A priced line, with the unit price taken from the event record. */
export interface LineItem {
  type: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface PromoLike {
  code: string;
  discountType: "flat" | "percent";
  discountValue: number;
  minOrderValue?: number;
}

export class PricingError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PricingError";
    this.status = status;
  }
}

const MAX_TICKETS_PER_ORDER = 20;

function availableFor(variant: TicketVariantLike): number {
  const raw = variant.remaining ?? variant.quantity;
  const n = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Resolve requested quantities into priced line items using the event's own
 * ticket variants. Throws a PricingError the caller can turn into a 4xx.
 */
export function resolveCart(
  event: EventLike,
  requested: RequestedItem[],
  currency: string
): LineItem[] {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new PricingError("Cart is empty");
  }

  const variants = event.ticketVariants ?? [];
  if (variants.length === 0) {
    throw new PricingError("This event has no tickets on sale");
  }

  // Collapse duplicate lines for the same ticket type so a buyer can't split
  // one oversized request across several entries to dodge the per-type check.
  const wanted = new Map<string, number>();
  for (const item of requested) {
    if (typeof item?.type !== "string" || item.type.length === 0) {
      throw new PricingError("Cart item is missing a ticket type");
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new PricingError(`Invalid quantity for "${item.type}"`);
    }
    wanted.set(item.type, (wanted.get(item.type) ?? 0) + qty);
  }

  const totalRequested = [...wanted.values()].reduce((a, b) => a + b, 0);
  if (totalRequested > MAX_TICKETS_PER_ORDER) {
    throw new PricingError(
      `A single order is limited to ${MAX_TICKETS_PER_ORDER} tickets`
    );
  }

  const lines: LineItem[] = [];
  for (const [type, quantity] of wanted) {
    const variant = variants.find((v) => v.type === type);
    if (!variant) {
      throw new PricingError(`Unknown ticket type: "${type}"`);
    }

    const available = availableFor(variant);
    if (available < quantity) {
      throw new PricingError(
        available === 0
          ? `"${type}" is sold out`
          : `Only ${available} "${type}" ticket(s) left`,
        409
      );
    }

    // toMinor throws on a malformed price, which is what we want: a corrupt
    // ticket price must fail loudly rather than be sold for nothing.
    let unitPriceMinor: number;
    try {
      unitPriceMinor = toMinor(variant.price, currency);
    } catch {
      throw new PricingError(`Ticket "${type}" has an invalid price`, 500);
    }

    lines.push({
      type,
      quantity,
      unitPriceMinor,
      lineTotalMinor: unitPriceMinor * quantity,
    });
  }

  return lines;
}

export function subtotalOf(lines: LineItem[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
}

/**
 * Work out the discount a promo code yields against a subtotal.
 * Returns 0 when the code doesn't clear its minimum order value.
 */
export function discountFor(
  subtotalMinor: number,
  promo: PromoLike | null | undefined,
  currency: string
): number {
  if (!promo) return 0;

  if (promo.minOrderValue != null) {
    const minMinor = toMinor(promo.minOrderValue, currency);
    if (subtotalMinor < minMinor) return 0;
  }

  const raw =
    promo.discountType === "flat"
      ? toMinor(promo.discountValue, currency)
      : percentOf(subtotalMinor, promo.discountValue);

  // A discount can zero an order out but never exceed it.
  return Math.min(raw, subtotalMinor);
}

export interface OrderTotals {
  subtotalMinor: number;
  discountMinor: number;
  /** Subtotal after discount, before fees. */
  netMinor: number;
  gatewayFeeMinor: number;
  platformFeeMinor: number;
  /** What the buyer is charged. */
  totalMinor: number;
  /** What the organizer receives once fees they bear are deducted. */
  payoutMinor: number;
}

/**
 * Compute every figure on the order.
 *
 * Fees are charged on the discounted amount. Whoever *bears* a fee determines
 * whether it is added to the buyer's total or deducted from the organizer's
 * payout — the previous implementation always added the gateway fee to the
 * buyer regardless of the event's setting.
 */
export function computeTotals(
  lines: LineItem[],
  options: {
    promo?: PromoLike | null;
    currency: string;
    gatewayFeeBearer?: FeeBearer;
    platformFeeBearer?: FeeBearer;
  }
): OrderTotals {
  const {
    promo = null,
    currency,
    gatewayFeeBearer = "user",
    platformFeeBearer = "user",
  } = options;

  const subtotalMinor = subtotalOf(lines);
  const discountMinor = discountFor(subtotalMinor, promo, currency);
  const netMinor = clampToZero(subtotalMinor - discountMinor);

  const gatewayFeeMinor = percentOf(netMinor, GATEWAY_FEE_PERCENT);
  const platformFeeMinor = percentOf(netMinor, PLATFORM_FEE_PERCENT);

  const buyerPays =
    netMinor +
    (gatewayFeeBearer === "user" ? gatewayFeeMinor : 0) +
    (platformFeeBearer === "user" ? platformFeeMinor : 0);

  const organizerBears =
    (gatewayFeeBearer === "organizer" ? gatewayFeeMinor : 0) +
    (platformFeeBearer === "organizer" ? platformFeeMinor : 0);

  return {
    subtotalMinor,
    discountMinor,
    netMinor,
    gatewayFeeMinor,
    platformFeeMinor,
    totalMinor: buyerPays,
    payoutMinor: clampToZero(netMinor - organizerBears),
  };
}
