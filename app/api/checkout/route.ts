import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { CheckoutError, createCheckout } from "@/lib/data/checkout";
import { PricingError } from "@/lib/pricing";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServer } from "@/lib/analytics/server";
import { log } from "@/lib/log";

/**
 * Create a checkout.
 *
 * The buyer sends ticket types and quantities only — prices are read from the
 * event and snapshotted server-side.
 */
const BodySchema = z.object({
  eventId: z.string().uuid(),
  cart: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive().max(20),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const checkoutId = await createCheckout(
      parsed.data.eventId,
      parsed.data.cart
    );

    trackServer(ANALYTICS_EVENTS.checkoutStarted, checkoutId, {
      eventId: parsed.data.eventId,
      checkoutId,
      ticketCount: parsed.data.cart.reduce((n, i) => n + i.quantity, 0),
      subtotalMinor: 0,
      currency: "",
    });

    return Response.json({ checkoutId });
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof PricingError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Checkout creation error", error, { route: "api/checkout" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
