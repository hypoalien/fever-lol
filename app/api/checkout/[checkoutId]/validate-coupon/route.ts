import { ObjectId } from "mongodb";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  isExpired,
  totalsForCheckout,
  type StoredCheckout,
} from "@/lib/checkout";
import { discountFor, type PromoLike } from "@/lib/pricing";

/**
 * Apply a promo code to a checkout.
 *
 * Two changes from the original: the discount is computed against the prices
 * stored on the checkout rather than a cart total supplied by the browser, and
 * the endpoint no longer demands a session — ticket buyers are anonymous, so
 * requiring `auth()` meant coupons could never be redeemed by an actual buyer.
 */

const BodySchema = z.object({
  couponCode: z.string().trim().min(1).max(64),
});

export async function POST(req: Request, props: { params: Promise<{ checkoutId: string }> }) {
  const params = await props.params;
  try {
    const { checkoutId } = params;
    if (!ObjectId.isValid(checkoutId)) {
      return Response.json({ error: "Invalid checkout id" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { success: false, message: "A coupon code is required" },
        { status: 400 }
      );
    }
    const couponCode = parsed.data.couponCode;

    const client = await db;
    const database = client.db();

    const checkout = (await database
      .collection("checkouts")
      .findOne({ _id: new ObjectId(checkoutId) })) as StoredCheckout | null;

    if (!checkout || !Array.isArray(checkout.items)) {
      return Response.json(
        { success: false, message: "Checkout not found" },
        { status: 404 }
      );
    }
    if (checkout.status === "paid") {
      return Response.json(
        { success: false, message: "This checkout has already been paid" },
        { status: 409 }
      );
    }
    if (isExpired(checkout)) {
      return Response.json(
        { success: false, message: "This checkout has expired" },
        { status: 410 }
      );
    }

    // The event is the source of truth for which codes exist.
    const event = await database
      .collection("events")
      .findOne({ _id: checkout.eventId as ObjectId });
    if (!event) {
      return Response.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    const promo: PromoLike | undefined = (event.promoCodes ?? []).find(
      (p: PromoLike) => p.code?.toLowerCase() === couponCode.toLowerCase()
    );

    if (!promo) {
      return Response.json(
        { success: false, message: "Invalid coupon code" },
        { status: 400 }
      );
    }

    // Check the minimum against the subtotal before deciding it applies, so we
    // can tell the buyer *why* a valid code didn't take.
    const subtotalMinor = checkout.subtotalMinor;
    const discountMinor = discountFor(subtotalMinor, promo, checkout.currency);

    if (discountMinor === 0 && promo.minOrderValue) {
      return Response.json(
        {
          success: false,
          message: `This coupon needs a minimum order of ${promo.minOrderValue}`,
        },
        { status: 400 }
      );
    }

    const storedPromo: PromoLike = {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderValue: promo.minOrderValue,
    };

    await database
      .collection("checkouts")
      .updateOne(
        { _id: new ObjectId(checkoutId) },
        { $set: { promo: storedPromo } }
      );

    const totals = totalsForCheckout(
      { ...checkout, promo: storedPromo },
      event
    );

    return Response.json({
      success: true,
      message: "Coupon applied successfully",
      couponDetails: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
      },
      totals,
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
