import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import {
  CheckoutError,
  assertUsable,
  loadCheckout,
  toGatewayAmountMinor,
  totalsFor,
} from "@/lib/data/checkout";
import {
  OversoldError,
  confirmOrder,
  findOrderByPayment,
  recordIncident,
} from "@/lib/data/orders";
import { getOrganizerRazorpayCredentials } from "@/lib/data/payment-config";
import {
  getRazorpayClient,
  verifyPaymentSignature,
  type RazorpayCredentials,
} from "@/lib/razorpay";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { flushAnalytics, trackServer } from "@/lib/analytics/server";
import { log } from "@/lib/log";

/**
 * Confirm a paid checkout and issue tickets.
 *
 * Replaces the old POST /api/orders/create, which was unauthenticated, never
 * checked with Razorpay that a payment had happened, took the cart and every
 * total from the request body, and hardcoded paymentStatus "completed".
 *
 * The sequence matters: verify the signature belongs to this checkout's
 * gateway order, confirm the payment against Razorpay's own records, recompute
 * the amount from stored prices, and only then write anything.
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

export async function POST(
  req: Request,
  props: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await props.params;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  const {
    razorpay_order_id: gatewayOrderId,
    razorpay_payment_id: gatewayPaymentId,
    razorpay_signature: signature,
    customerInfo,
  } = parsed.data;

  try {
    // Idempotency: a retried confirmation must not mint a second set of
    // tickets. The unique index on gateway_payment_id backs this up.
    const existing = await findOrderByPayment(gatewayPaymentId);
    if (existing) {
      return Response.json({
        success: true,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
      });
    }

    const loaded = await loadCheckout(checkoutId);
    if (!loaded) {
      return Response.json({ error: "Checkout not found" }, { status: 404 });
    }
    assertUsable(loaded);

    if (loaded.checkout.gatewayOrderId !== gatewayOrderId) {
      return Response.json(
        { error: "Payment does not match this checkout" },
        { status: 400 }
      );
    }

    // Verified against whichever account minted the order. Checking an
    // organizer-account payment with the platform secret would reject every
    // legitimate signature.
    const credentials: RazorpayCredentials | undefined =
      (await getOrganizerRazorpayCredentials(loaded.event.userId)) ?? undefined;

    if (
      !verifyPaymentSignature(
        {
          razorpayOrderId: gatewayOrderId,
          razorpayPaymentId: gatewayPaymentId,
          signature,
        },
        credentials?.keySecret
      )
    ) {
      trackServer(ANALYTICS_EVENTS.paymentFailed, checkoutId, {
        checkoutId,
        reason: "invalid_signature",
      });
      // Previously this returned HTTP 200, so the browser's axios call
      // resolved and the flow carried on to issue tickets.
      return Response.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const totals = totalsFor(loaded);
    const expectedAmountMinor = toGatewayAmountMinor(
      totals.totalMinor,
      loaded.checkout.currency
    );

    // The signature proves the ids were minted by us; this proves money moved.
    let payment;
    try {
      payment = await getRazorpayClient(credentials).payments.fetch(
        gatewayPaymentId
      );
    } catch (error) {
      log.exception("Could not fetch payment from Razorpay", error, { route: "api/checkout/[checkoutId]/confirm" });
      return Response.json(
        { error: "Could not verify payment with the gateway" },
        { status: 502 }
      );
    }

    if (payment.order_id !== gatewayOrderId) {
      return Response.json(
        { error: "Payment/order mismatch" },
        { status: 400 }
      );
    }
    const status = String(payment.status);
    if (!["captured", "authorized"].includes(status)) {
      return Response.json(
        { error: `Payment is not complete (status: ${status})` },
        { status: 402 }
      );
    }
    if (Number(payment.amount) !== expectedAmountMinor) {
      log.error(`Amount mismatch for ${gatewayPaymentId}: gateway ${payment.amount}, expected ${expectedAmountMinor}`, { route: "api/checkout/[checkoutId]/confirm" });
      return Response.json(
        { error: "Payment amount mismatch" },
        { status: 400 }
      );
    }

    const order = await confirmOrder({
      loaded,
      totals,
      customer: customerInfo,
      gatewayPaymentId,
      gatewayOrderId,
      captured: status === "captured",
    });

    // Captured server-side so a buyer closing the tab still registers.
    trackServer(ANALYTICS_EVENTS.paymentSucceeded, customerInfo.email, {
      checkoutId,
      orderId: order.orderId,
      totalMinor: totals.totalMinor,
      currency: loaded.checkout.currency,
      ticketCount: order.ticketCodes.length,
    });
    await flushAnalytics();

    return Response.json({
      success: true,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      tickets: order.ticketCodes,
    });
  } catch (error) {
    if (error instanceof OversoldError) {
      // Money was taken but the stock went. Record it for refund rather than
      // issuing tickets that do not exist.
      await recordIncident({
        checkoutId,
        kind: "oversold",
        gatewayPaymentId,
        gatewayOrderId,
        amountMinor: 0,
        currency: "",
        detail: error.message,
      }).catch(() => undefined);

      return Response.json(
        {
          error:
            "Those tickets sold out while your payment was processing. Our team will refund you.",
        },
        { status: 409 }
      );
    }
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Error confirming checkout", error, { route: "api/checkout/[checkoutId]/confirm" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
