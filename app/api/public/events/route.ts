import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { listPublicEventsForOrg } from "@/lib/data/events";
import { findUserByOrgUrl } from "@/lib/data/users";
import { log } from "@/lib/log";

/** Public organization page: the org's details plus its events on sale. */
const BodySchema = z.object({ slug: z.string().trim().min(1).max(100) });

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const organizer = await findUserByOrgUrl(parsed.data.slug);
    if (!organizer) {
      return Response.json({ error: "Organizer not found" }, { status: 404 });
    }

    const { events } = await listPublicEventsForOrg(parsed.data.slug);
    const mine = events.filter(Boolean);

    return Response.json({
      name: organizer.orgName ?? organizer.orgUrl ?? "",
      avatar: organizer.image ?? "/placeholder-user.jpg",
      events: mine.map((event) => ({
        id: event.id,
        title: event.title ?? "",
        location: event.venueName ?? null,
        date: event.startsAt ? new Date(event.startsAt).toISOString() : null,
        eventFlyer: event.eventFlyer,
      })),
    });
  } catch (error) {
    log.exception("Error fetching organizer events", error, { route: "api/public/events" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
