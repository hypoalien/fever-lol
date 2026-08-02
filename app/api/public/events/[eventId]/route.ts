import { findEventWithDetails } from "@/lib/data/events";
import { log } from "@/lib/log";

/**
 * Public event page.
 *
 * Only published events are visible, and the payload deliberately excludes the
 * organizer's email, which the previous version returned to every visitor.
 */
export async function GET(
  _req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await props.params;

  try {
    const event = await findEventWithDetails(eventId);
    if (!event || event.status !== "active") {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    return Response.json({
      id: event.id,
      eventName: event.eventName,
      eventDescription: event.description,
      eventFlyer: event.eventFlyer,
      currency: event.currency,
      timings: event.timings,
      platformFee: event.platformFee,
      paymentGatewayFee: event.paymentGatewayFee,
      ticketVariants: event.ticketVariants.map((variant) => ({
        id: variant.id,
        type: variant.type,
        description: variant.description,
        priceMinor: variant.priceMinor,
        remaining: variant.remaining,
      })),
      venue: event.venue,
    });
  } catch (error) {
    log.exception("Error fetching event details", error, { route: "api/public/events/[eventId]" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
