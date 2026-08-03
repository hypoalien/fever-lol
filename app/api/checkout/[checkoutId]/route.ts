import {
  CheckoutError,
  GATEWAY_SETTLEMENT_CURRENCY,
  assertUsable,
  checkoutContext,
  loadCheckout,
  toGatewayAmountMinor,
  totalsFor,
} from "@/lib/data/checkout";
import { log } from "@/lib/log";

/**
 * Read a checkout back for the payment page.
 *
 * Totals are recomputed rather than read from storage, so the number shown to
 * the buyer comes from the same code path that later authorises the charge.
 * No gateway credentials are included.
 */
export async function GET(
  _req: Request,
  props: { params: Promise<{ checkoutId: string }> }
) {
  const { checkoutId } = await props.params;

  try {
    const loaded = await loadCheckout(checkoutId);
    if (!loaded) {
      return Response.json({ error: "Checkout not found" }, { status: 404 });
    }
    assertUsable(loaded);

    const totals = totalsFor(loaded);
    const { venue, gateway, timings } = await checkoutContext(loaded);

    return Response.json({
      checkoutId,
      status: loaded.checkout.status,
      expiresAt: loaded.checkout.expiresAt,
      currency: loaded.checkout.currency,
      items: loaded.items,
      promo: loaded.promo ? { code: loaded.promo.code } : null,
      totals,
      event: {
        id: loaded.event.id,
        eventName: loaded.event.eventName,
        eventFlyer: loaded.event.eventFlyer,
        description: loaded.event.description,
        currency: loaded.checkout.currency,
        timings: timings.map((timing) => ({
          date: timing.startsAt.toISOString(),
          startTime: timing.startsAt.toISOString().slice(11, 16),
          endTime: timing.endsAt?.toISOString().slice(11, 16) ?? null,
        })),
      },
      venue: venue
        ? {
            id: venue.id,
            venueName: venue.venueName,
            city: venue.city,
            address: venue.address,
            mapLink: venue.mapLink,
          }
        : null,
      paymentGateway: {
        provider: gateway,
        currency: GATEWAY_SETTLEMENT_CURRENCY,
        amountMinor: toGatewayAmountMinor(
          totals.totalMinor,
          loaded.checkout.currency
        ),
      },
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    log.exception("Error fetching checkout", error, { route: "api/checkout/[checkoutId]" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
