import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import {
  CheckoutError,
  applyPromoCode,
  assertUsable,
  loadCheckout,
} from "@/lib/data/checkout";
import { log } from "@/lib/log";

/**
 * Apply a promo code.
 *
 * The discount is computed from the prices stored on the checkout, not from a
 * cart total supplied by the browser. The endpoint also no longer requires a
 * session — ticket buyers are anonymous, so demanding one meant coupons could
 * never be redeemed by an actual buyer.
 */
const BodySchema = z.object({
  couponCode: z.string().trim().min(1).max(64),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await props.params;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const loaded = await loadCheckout(checkoutId);
    if (!loaded) {
      return Response.json(
        { success: false, message: "Checkout not found" },
        { status: 404 }
      );
    }
    assertUsable(loaded);

    const result = await applyPromoCode(loaded, parsed.data.couponCode);
    if ("error" in result) {
      return Response.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Coupon applied successfully",
      couponDetails: {
        code: result.promo.code,
        discountType: result.promo.discountType,
        discountValue: result.promo.discountValue,
      },
      totals: result.totals,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    log.exception("Error validating coupon", error, { route: "api/checkout/[checkoutId]/validate-coupon" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
