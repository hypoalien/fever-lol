import { ObjectId } from "mongodb";
import { z } from "zod";

import { db } from "@/lib/mongo";
import {
  GATEWAY_SETTLEMENT_CURRENCY,
  isExpired,
  toGatewayAmountMinor,
  totalsForCheckout,
  type StoredCheckout,
} from "@/lib/checkout";
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay";

/**
 * Open a Razorpay order for an existing checkout.
 *
 * The amount is derived from the stored checkout — it is no longer accepted
 * from the request body, where the browser previously computed it (and could
 * therefore set it to anything).
 */

const BodySchema = z.object({
  checkoutId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    if (!isRazorpayConfigured()) {
      return Response.json(
        { error: "Payments are not configured" },
        { status: 503 }
      );
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success || !ObjectId.isValid(parsed.data.checkoutId)) {
      return Response.json({ error: "Invalid checkout id" }, { status: 400 });
    }
    const checkoutId = parsed.data.checkoutId;

    const client = await db;
    const database = client.db();

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

    const event = await database
      .collection("events")
      .findOne({ _id: checkout.eventId as ObjectId });
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "active") {
      return Response.json({ error: "This event is not on sale" }, { status: 409 });
    }

    const totals = totalsForCheckout(checkout, event);
    if (totals.totalMinor <= 0) {
      return Response.json(
        { error: "Nothing to pay for this checkout" },
        { status: 400 }
      );
    }

    const amountMinor = toGatewayAmountMinor(totals.totalMinor, checkout.currency);

    const order = await getRazorpayClient().orders.create({
      amount: amountMinor,
      currency: GATEWAY_SETTLEMENT_CURRENCY,
      // Ties the gateway order back to our checkout for reconciliation.
      receipt: `checkout_${checkoutId}`,
      notes: { checkoutId, eventId: String(checkout.eventId) },
    });

    // Remember which gateway order belongs to this checkout so confirmation can
    // reject a signature that was minted for some other order.
    await database
      .collection("checkouts")
      .updateOne(
        { _id: new ObjectId(checkoutId) },
        { $set: { razorpayOrderId: order.id, gatewayAmountMinor: amountMinor } }
      );

    return Response.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return Response.json({ error: "Could not start payment" }, { status: 502 });
  }
}
