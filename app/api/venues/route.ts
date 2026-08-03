import { invalidRequest } from "@/lib/api";
import {
  VenueInputSchema,
  createVenue,
  listVenues,
} from "@/lib/data/venues";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    return Response.json(await listVenues(session.user.id));
  } catch (error) {
    log.exception("Error fetching venues", error, { route: "api/venues" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = VenueInputSchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error, "Invalid venue");

  try {
    const venue = await createVenue(session.user.id, parsed.data);
    return Response.json(venue, { status: 201 });
  } catch (error) {
    log.exception("Error creating venue", error, { route: "api/venues" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
