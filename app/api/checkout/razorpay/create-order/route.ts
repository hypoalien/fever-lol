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
import { getOrganizerRazorpayCredentials } from "@/lib/data/payment-config";
import {
  getPlatformCredentials,
  getRazorpayClient,
  isRazorpayConfigured,
  platformFallbackAllowed,
  type RazorpayCredentials,
} from "@/lib/razorpay";
import { log } from "@/lib/log";

/**
 * Open a Razorpay order for an existing checkout.
 *
 * The amount is derived from the stored checkout; it is no longer accepted
 * from the request body, where the browser used to compute it.
 */
const BodySchema = z.object({ checkoutId: z.string().uuid() });

export async function POST(req: Request) {
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

    // The organizer's own account. Money goes to them directly, which is what
    // buyers are told on the landing page — the platform holds none of it and
    // has no mechanism to pay it out, so there is deliberately no silent
    // fallback to the platform account here.
    const credentials: RazorpayCredentials | undefined =
      (await getOrganizerRazorpayCredentials(loaded.event.userId)) ?? undefined;

    if (!credentials && !(platformFallbackAllowed() && isRazorpayConfigured())) {
      return Response.json(
        { error: "This organizer has not set up payments yet" },
        { status: 503 }
      );
    }

    const order = await getRazorpayClient(credentials).orders.create({
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
      // The public key of whichever account minted this order. The browser
      // used to read NEXT_PUBLIC_RAZORPAY_KEY_ID, which is the platform's —
      // so an order opened on an organizer's account was handed to Razorpay
      // under the wrong key and rejected.
      keyId: credentials?.keyId ?? getPlatformCredentials().keyId,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Razorpay order creation failed", error, { route: "api/checkout/razorpay/create-order" });
    return Response.json({ error: "Could not start payment" }, { status: 502 });
  }
}
