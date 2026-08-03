import { ObjectId } from "mongodb";

import { db } from "@/lib/mongo";
import {
  GATEWAY_SETTLEMENT_CURRENCY,
  isExpired,
  toGatewayAmountMinor,
  totalsForCheckout,
  type StoredCheckout,
} from "@/lib/checkout";

/**
 * Read a checkout back for the payment page.
 *
 * Totals are recomputed here rather than read from storage, so the number the
 * buyer sees is produced by the same code path that will later authorise the
 * charge. The response deliberately carries no gateway credentials.
 */
export async function GET(_req: Request, props: { params: Promise<{ checkoutId: string }> }) {
  const params = await props.params;
  try {
    const { checkoutId } = params;
    if (!ObjectId.isValid(checkoutId)) {
      return Response.json({ error: "Invalid checkout id" }, { status: 400 });
    }

    const client = await db;
    const database = client.db();

    const checkout = (await database
      .collection("checkouts")
      .findOne({ _id: new ObjectId(checkoutId) })) as StoredCheckout | null;

    if (!checkout) {
      return Response.json({ error: "Checkout not found" }, { status: 404 });
    }

    // Legacy checkouts predate server-side pricing and have no `items`.
    if (!Array.isArray(checkout.items)) {
      return Response.json(
        { error: "This checkout is no longer valid. Please start again." },
        { status: 409 }
      );
    }

    if (checkout.status === "paid") {
      return Response.json(
        { error: "This checkout has already been paid" },
        { status: 409 }
      );
    }
    if (isExpired(checkout)) {
      return Response.json(
        { error: "This checkout has expired. Please start again." },
        { status: 410 }
      );
    }

    const event = await database
      .collection("events")
      .findOne({ _id: checkout.eventId as ObjectId });
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    const venue = event.venue?.id
      ? await database
          .collection("venues")
          .findOne({ _id: new ObjectId(String(event.venue.id)) })
      : null;

    const paymentConfig = await database
      .collection("payment_configs")
      .findOne(
        { userId: event.userId },
        { projection: { paymentGateway: 1 } }
      );

    const totals = totalsForCheckout(checkout, event);

    return Response.json({
      checkoutId,
      status: checkout.status,
      expiresAt: checkout.expiresAt,
      currency: checkout.currency,
      items: checkout.items,
      promo: checkout.promo ? { code: checkout.promo.code } : null,
      totals,
      event: {
        _id: event._id,
        eventName: event.eventName,
        eventFlyer: event.eventFlyer,
        timings: event.timings,
        description: event.description,
        status: event.status,
        currency: checkout.currency,
      },
      venue: venue
        ? {
            _id: venue._id,
            venueName: venue.venueName,
            city: venue.city,
            address: venue.address ?? null,
            mapLink: venue.mapLink ?? null,
          }
        : null,
      paymentGateway: {
        provider: paymentConfig?.paymentGateway ?? "razorpay",
        currency: GATEWAY_SETTLEMENT_CURRENCY,
        // What the buyer will actually be charged at the gateway, converted
        // server-side. The browser used to do this with a hardcoded rate.
        amountMinor: toGatewayAmountMinor(totals.totalMinor, checkout.currency),
      },
    });
  } catch (error) {
    console.error("Error fetching checkout:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
