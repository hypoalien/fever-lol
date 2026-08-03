import { invalidRequest } from "@/lib/api";
import {
  VenueInputSchema,
  deleteOwnedVenue,
  updateOwnedVenue,
} from "@/lib/data/venues";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function PUT(
  req: Request,
  props: { params: Promise<{ venueId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { venueId } = await props.params;
  const parsed = VenueInputSchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error, "Invalid venue");

  try {
    const venue = await updateOwnedVenue(venueId, session.user.id, parsed.data);
    if (!venue) {
      return Response.json({ error: "Venue not found" }, { status: 404 });
    }
    return Response.json(venue);
  } catch (error) {
    log.exception("Error updating venue", error, { route: "api/venues/[venueId]" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ venueId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { venueId } = await props.params;

  try {
    const deleted = await deleteOwnedVenue(venueId, session.user.id);
    if (!deleted) {
      return Response.json({ error: "Venue not found" }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    log.exception("Error deleting venue", error, { route: "api/venues/[venueId]" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
