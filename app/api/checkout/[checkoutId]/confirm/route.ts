import crypto from "crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  isExpired,
  toGatewayAmountMinor,
  totalsForCheckout,
  type StoredCheckout,
} from "@/lib/checkout";
import { toMajor } from "@/lib/money";
import { getRazorpayClient, verifyPaymentSignature } from "@/lib/razorpay";
import type { LineItem } from "@/lib/pricing";

/**
 * Confirm a paid checkout and issue tickets.
 *
 * This replaces the old `POST /api/orders/create`, which was unauthenticated,
 * never checked with Razorpay that a payment had happened, took the cart and
 * every total from the request body, and hardcoded `paymentStatus: "completed"`.
 *
 * The order here matters. We verify the signature, confirm the payment against
 * Razorpay's own records, recompute the amount from our stored checkout, and
 * only then reserve inventory and write the order.
 */

const BodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  customerInfo: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().min(3).max(32),
  }),
});

/** Unguessable ticket identifier. The old scheme was Date.now() + Math.random(). */
function ticketCode(): string {
  return `TKT-${crypto.randomBytes(16).toString("base64url")}`;
}

function orderNumber(): string {
  return `ORD-${crypto.randomBytes(6).toString("base64url").toUpperCase()}`;
}

/**
 * Decrement remaining stock for the purchased lines.
 *
 * Implemented as a compare-and-swap on the event document: we read the current
 * variants, compute the new ones in memory (coercing the string quantities that
 * the event form historically wrote), then write them back only if nobody else
 * changed the inventory in the meantime. Single-document updates are atomic in
 * MongoDB, so two concurrent buyers cannot both win the last ticket.
 */
async function reserveInventory(
  database: Db,
  eventId: ObjectId,
  items: LineItem[],
  revenueMajor: number
): Promise<{ ok: true } | { ok: false; reason: string }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const event = await database.collection("events").findOne({ _id: eventId });
    if (!event) return { ok: false, reason: "Event not found" };

    const variants: Document[] = Array.isArray(event.ticketVariants)
      ? event.ticketVariants.map((v: Document) => ({ ...v }))
      : [];

    for (const item of items) {
      const variant = variants.find((v) => v.type === item.type);
      if (!variant) {
        return { ok: false, reason: `Unknown ticket type: ${item.type}` };
      }
      const rawRemaining = variant.remaining ?? variant.quantity;
      const remaining = Number(rawRemaining);
      if (!Number.isFinite(remaining) || remaining < item.quantity) {
        return { ok: false, reason: `"${item.type}" is no longer available` };
      }
      variant.remaining = remaining - item.quantity;
    }

    const version = Number(event.inventoryVersion ?? 0);
    const soldCount = items.reduce((n, i) => n + i.quantity, 0);

    const result = await database.collection("events").updateOne(
      { _id: eventId, inventoryVersion: event.inventoryVersion ?? { $in: [0, null] } },
      {
        $set: { ticketVariants: variants, inventoryVersion: version + 1 },
        $inc: { ticketsSold: soldCount, revenue: revenueMajor },
      }
    );

    if (result.modifiedCount === 1) return { ok: true };
    // Lost the race — re-read and try again.
  }
  return { ok: false, reason: "Could not reserve tickets, please retry" };
}

export async function POST(
  req: Request,
  { params }: { params: { checkoutId: string } }
) {
  try {
    const { checkoutId } = params;
    if (!ObjectId.isValid(checkoutId)) {
      return Response.json({ error: "Invalid checkout id" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const {
      razorpay_order_id: gatewayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      customerInfo,
    } = parsed.data;

    const client = await db;
    const database = client.db();
    const orders = database.collection("orders");

    // Idempotency: a retried confirmation must not mint a second set of tickets.
    const existing = await orders.findOne({ paymentId });
    if (existing) {
      return Response.json({ success: true, orderId: existing.orderId });
    }

    const checkout = (await database
      .collection("checkouts")
      .findOne({ _id: new ObjectId(checkoutId) })) as StoredCheckout | null;

    if (!checkout || !Array.isArray(checkout.items)) {
      return Response.json({ error: "Checkout not found" }, { status: 404 });
    }
    if (checkout.status === "paid") {
      return Response.json(
        { error: "This checkout has already been paid" },
        { status: 409 }
      );
    }
    if (isExpired(checkout)) {
      return Response.json({ error: "This checkout has expired" }, { status: 410 });
    }

    // The signature must belong to the gateway order we opened for *this* checkout.
    if (!checkout.razorpayOrderId || checkout.razorpayOrderId !== gatewayOrderId) {
      return Response.json(
        { error: "Payment does not match this checkout" },
        { status: 400 }
      );
    }

    if (
      !verifyPaymentSignature({
        razorpayOrderId: gatewayOrderId,
        razorpayPaymentId: paymentId,
        signature,
      })
    ) {
      // Previously this returned HTTP 200, so the browser's axios call resolved
      // and the flow carried on to issue tickets.
      return Response.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const event = await database
      .collection("events")
      .findOne({ _id: checkout.eventId as ObjectId });
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    const totals = totalsForCheckout(checkout, event);
    const expectedAmountMinor = toGatewayAmountMinor(
      totals.totalMinor,
      checkout.currency
    );

    // Confirm with Razorpay that this payment exists, is captured, and is for
    // the amount we expect. The signature alone proves the ids were minted by
    // us; this proves money actually moved.
    let payment;
    try {
      payment = await getRazorpayClient().payments.fetch(paymentId);
    } catch (error) {
      console.error("Could not fetch payment from Razorpay:", error);
      return Response.json(
        { error: "Could not verify payment with the gateway" },
        { status: 502 }
      );
    }

    if (payment.order_id !== gatewayOrderId) {
      return Response.json({ error: "Payment/order mismatch" }, { status: 400 });
    }
    if (!["captured", "authorized"].includes(String(payment.status))) {
      return Response.json(
        { error: `Payment is not complete (status: ${payment.status})` },
        { status: 402 }
      );
    }
    if (Number(payment.amount) !== expectedAmountMinor) {
      console.error(
        `Amount mismatch for ${paymentId}: gateway ${payment.amount}, expected ${expectedAmountMinor}`
      );
      return Response.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    const totalMajor = toMajor(totals.totalMinor, checkout.currency);
    const reserved = await reserveInventory(
      database,
      checkout.eventId as ObjectId,
      checkout.items,
      totalMajor
    );
    if (!reserved.ok) {
      // Money has been taken but stock vanished underneath us. Record it for
      // refund rather than silently issuing tickets that don't exist.
      await database.collection("payment_incidents").insertOne({
        type: "oversold",
        checkoutId: new ObjectId(checkoutId),
        paymentId,
        gatewayOrderId,
        amountMinor: expectedAmountMinor,
        reason: reserved.reason,
        createdAt: new Date(),
      });
      return Response.json(
        {
          error:
            "Those tickets sold out while your payment was processing. You have not been charged for tickets we cannot issue — our team will refund you.",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`.trim();
    const orderId = orderNumber();

    const order = {
      _id: new ObjectId(),
      orderId,
      orderDate: now.toISOString(),
      customerName,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      eventName: event.eventName ?? "",
      eventId: String(checkout.eventId),
      organizerId: event.userId,
      currency: checkout.currency,
      // Minor units are authoritative; the major-unit fields are kept for the
      // existing dashboard queries until the Postgres port lands.
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      gatewayFeeMinor: totals.gatewayFeeMinor,
      platformFeeMinor: totals.platformFeeMinor,
      totalMinor: totals.totalMinor,
      payoutMinor: totals.payoutMinor,
      subtotal: toMajor(totals.subtotalMinor, checkout.currency),
      discounts: toMajor(totals.discountMinor, checkout.currency),
      paymentGatewayFee: toMajor(totals.gatewayFeeMinor, checkout.currency),
      platformFee: toMajor(totals.platformFeeMinor, checkout.currency),
      totalAmountPaid: totalMajor,
      payoutAmount: toMajor(totals.payoutMinor, checkout.currency),
      paymentStatus: payment.status === "captured" ? "completed" : "pending",
      orderStatus: "confirmed",
      payoutStatus: "pending",
      event: {
        name: event.eventName ?? "",
        date: event.timings?.[0]?.date ?? null,
        startTime: event.timings?.[0]?.startTime ?? null,
        venue: event.venue?.name ?? null,
        address: event.venue?.address ?? null,
        mapLink: event.venue?.mapLink ?? null,
        platformFee: event.platformFee ?? "user",
        paymentGatewayFee: event.paymentGatewayFee ?? "user",
      },
      ticketDetails: checkout.items.map((i) => ({
        type: i.type,
        quantity: i.quantity,
        price: toMajor(i.unitPriceMinor, checkout.currency),
      })),
      paymentId,
      razorpayOrderId: gatewayOrderId,
      createdAt: now,
    };

    await orders.insertOne(order);

    const tickets = checkout.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        _id: new ObjectId(),
        orderId,
        eventId: String(checkout.eventId),
        ticketType: item.type,
        price: toMajor(item.unitPriceMinor, checkout.currency),
        currency: checkout.currency,
        customerName,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone,
        status: "active",
        qrCode: ticketCode(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }))
    );
    if (tickets.length > 0) {
      await database.collection("tickets").insertMany(tickets);
    }

    await database
      .collection("checkouts")
      .updateOne(
        { _id: new ObjectId(checkoutId) },
        { $set: { status: "paid", paidAt: now, orderId } }
      );

    return Response.json({
      success: true,
      orderId,
      tickets: tickets.map((t) => t.qrCode),
    });
  } catch (error) {
    console.error("Error confirming checkout:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
