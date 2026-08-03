import { eq } from "drizzle-orm";
import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import {
  CheckoutError,
  GATEWAY_SETTLEMENT_CURRENCY,
  assertUsable,
  loadCheckout,
  toGatewayAmountMinor,
  totalsFor,
} from "@/lib/data/checkout";
import { db } from "@/lib/db";
import { checkouts } from "@/lib/db/schema";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";
import { log } from "@/lib/log";

/**
 * Open a Razorpay order for an existing checkout.
 *
 * The amount is derived from the stored checkout; it is no longer accepted
 * from the request body, where the browser used to compute it.
 */
const BodySchema = z.object({ checkoutId: z.string().uuid() });

export async function POST(req: Request) {
  if (!isRazorpayConfigured()) {
    return Response.json(
      { error: "Payments are not configured" },
      { status: 503 }
    );
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);
  const { checkoutId } = parsed.data;

  try {
    const loaded = await loadCheckout(checkoutId);
    if (!loaded) {
      return Response.json({ error: "Checkout not found" }, { status: 404 });
    }
    assertUsable(loaded);

    if (loaded.event.status !== "active") {
      return Response.json(
        { error: "This event is not on sale" },
        { status: 409 }
      );
    }

    const totals = totalsFor(loaded);
    if (totals.totalMinor <= 0) {
      return Response.json(
        { error: "Nothing to pay for this checkout" },
        { status: 400 }
      );
    }

    const amountMinor = toGatewayAmountMinor(
      totals.totalMinor,
      loaded.checkout.currency
    );

    const order = await getRazorpayClient().orders.create({
      amount: amountMinor,
      currency: GATEWAY_SETTLEMENT_CURRENCY,
      receipt: `checkout_${checkoutId}`,
      notes: { checkoutId, eventId: loaded.event.id },
    });

    // Recorded so confirmation can reject a signature minted for another order.
    await db
      .update(checkouts)
      .set({ gatewayOrderId: order.id, gatewayAmountMinor: amountMinor })
      .where(eq(checkouts.id, checkoutId));

    return Response.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Razorpay order creation failed", error, { route: "api/checkout/razorpay/create-order" });
    return Response.json({ error: "Could not start payment" }, { status: 502 });
  }
}
