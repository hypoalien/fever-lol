import { invalidRequest } from "@/lib/api";
import {
  VenueInputSchema,
  createVenue,
  listVenues,
} from "@/lib/data/venues";
import { requireUser } from "@/lib/session";

export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    return Response.json(await listVenues(session.user.id));
  } catch (error) {
    console.error("Error fetching venues:", error);
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
    console.error("Error creating venue:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
