import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { CheckoutError, createCheckout } from "@/lib/data/checkout";
import { PricingError } from "@/lib/pricing";

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
    return Response.json({ checkoutId });
  } catch (error) {
    if (error instanceof CheckoutError || error instanceof PricingError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout creation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
