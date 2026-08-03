import { ObjectId } from "mongodb";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  PricingError,
  resolveCart,
  subtotalOf,
  type EventLike,
} from "@/lib/pricing";
import { CHECKOUT_TTL_MS, resolveEventCurrency } from "@/lib/checkout";

/**
 * Create a checkout.
 *
 * The buyer sends ticket *types and quantities only*. Prices are read from the
 * event document and snapshotted onto the checkout, so a later edit to the
 * event can't change what this buyer agreed to pay — and, more importantly, so
 * the browser can never dictate a price.
 */

const BodySchema = z.object({
  eventId: z.string().min(1),
  cart: z
    .array(
      z.object({
        type: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { eventId, cart } = parsed.data;

    if (!ObjectId.isValid(eventId)) {
      return Response.json({ error: "Invalid event id" }, { status: 400 });
    }

    const client = await db;
    const database = client.db();

    const event = await database
      .collection("events")
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== "active") {
      return Response.json(
        { error: "This event is not on sale" },
        { status: 409 }
      );
    }

    const currency = await resolveEventCurrency(database, event);
    const items = resolveCart(event as EventLike, cart, currency);

    const now = new Date();
    const result = await database.collection("checkouts").insertOne({
      eventId: event._id,
      organizerId: event.userId,
      currency,
      items,
      subtotalMinor: subtotalOf(items),
      promo: null,
      status: "pending",
      createdAt: now,
      expiresAt: new Date(now.getTime() + CHECKOUT_TTL_MS),
    });

    return Response.json({ checkoutId: result.insertedId.toString() });
  } catch (error) {
    if (error instanceof PricingError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Checkout creation error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
