import crypto from "crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  checkoutItems,
  checkouts,
  orderItems,
  orders,
  paymentIncidents,
  promoCodes,
  ticketVariants,
  tickets,
} from "@/lib/db/schema";
import type { LoadedCheckout } from "@/lib/data/checkout";
import type { OrderTotals } from "@/lib/pricing";

/** Unguessable ticket identifier. The old scheme was Date.now() + Math.random(). */
function ticketCode(): string {
  return `TKT-${crypto.randomBytes(16).toString("base64url")}`;
}

function orderNumber(): string {
  return `ORD-${crypto.randomBytes(6).toString("base64url").toUpperCase()}`;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface ConfirmedOrder {
  orderId: string;
  orderNumber: string;
  ticketCodes: string[];
}

export class OversoldError extends Error {
  constructor(readonly type: string) {
    super(`"${type}" sold out while the payment was processing`);
    this.name = "OversoldError";
  }
}

/**
 * Turn a paid checkout into an order, its line items and its tickets.
 *
 * Everything happens in one transaction. Stock is decremented with a guarded
 * UPDATE — the check constraint on ticket_variants means a concurrent buyer
 * cannot push it negative, and a zero-row result tells us we lost the race, so
 * the whole transaction rolls back rather than issuing tickets that don't exist.
 */
export async function confirmOrder({
  loaded,
  totals,
  customer,
  gatewayPaymentId,
  gatewayOrderId,
  captured,
}: {
  loaded: LoadedCheckout;
  totals: OrderTotals;
  customer: CustomerInfo;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  captured: boolean;
}): Promise<ConfirmedOrder> {
  const { checkout, event } = loaded;
  const customerName = `${customer.firstName} ${customer.lastName}`.trim();

  return db.transaction(async (tx) => {
    const lines = await tx
      .select()
      .from(checkoutItems)
      .where(eq(checkoutItems.checkoutId, checkout.id));

    for (const line of lines) {
      // The WHERE clause is the guard: it only matches while enough stock
      // remains, so two concurrent confirmations cannot both succeed.
      const updated = await tx
        .update(ticketVariants)
        .set({
          quantityRemaining: sql`${ticketVariants.quantityRemaining} - ${line.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          sql`${ticketVariants.id} = ${line.ticketVariantId}
              and ${ticketVariants.quantityRemaining} >= ${line.quantity}`
        )
        .returning({ id: ticketVariants.id });

      if (updated.length === 0) throw new OversoldError(line.type);
    }

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: orderNumber(),
        eventId: event.id,
        organizerId: event.userId,
        checkoutId: checkout.id,
        customerName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        currency: checkout.currency,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        gatewayFeeMinor: totals.gatewayFeeMinor,
        platformFeeMinor: totals.platformFeeMinor,
        totalMinor: totals.totalMinor,
        payoutMinor: totals.payoutMinor,
        paymentStatus: captured ? "completed" : "authorized",
        orderStatus: "confirmed",
        gateway: "razorpay",
        gatewayPaymentId,
        gatewayOrderId,
        eventSnapshot: {
          name: event.eventName,
          flyer: event.eventFlyer,
          platformFeeBearer: event.platformFeeBearer,
          gatewayFeeBearer: event.gatewayFeeBearer,
        },
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((line) => ({
        orderId: order.id,
        ticketVariantId: line.ticketVariantId,
        type: line.type,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
      }))
    );

    const issued = lines.flatMap((line) =>
      Array.from({ length: line.quantity }, () => ({
        orderId: order.id,
        eventId: event.id,
        ticketVariantId: line.ticketVariantId,
        code: ticketCode(),
        type: line.type,
        pricePaidMinor: line.unitPriceMinor,
        attendeeName: customerName,
        attendeeEmail: customer.email,
        attendeePhone: customer.phone,
      }))
    );
    const created = await tx
      .insert(tickets)
      .values(issued)
      .returning({ code: tickets.code });

    if (checkout.promoCodeId) {
      await tx
        .update(promoCodes)
        .set({ timesRedeemed: sql`${promoCodes.timesRedeemed} + 1` })
        .where(eq(promoCodes.id, checkout.promoCodeId));
    }

    await tx
      .update(checkouts)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(checkouts.id, checkout.id));

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      ticketCodes: created.map((t) => t.code),
    };
  });
}

/** An order already exists for this gateway payment — return it unchanged. */
export async function findOrderByPayment(gatewayPaymentId: string) {
  const [order] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.gatewayPaymentId, gatewayPaymentId));
  return order ?? null;
}

/**
 * Money was taken but tickets could not be issued. Recorded so a human can
 * refund, rather than the failure disappearing into a log line.
 */
export async function recordIncident(input: {
  checkoutId: string;
  kind: string;
  gatewayPaymentId: string;
  gatewayOrderId: string;
  amountMinor: number;
  currency: string;
  detail: string;
}): Promise<void> {
  await db.insert(paymentIncidents).values(input);
}
