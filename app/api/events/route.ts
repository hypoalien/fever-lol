import { listEventsForUser } from "@/lib/data/events";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

/**
 * The organizer's events.
 *
 * Still POST rather than GET because that is what the dashboard calls today;
 * correcting the verb belongs with the client rework, not with this port.
 */
export async function POST() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    return Response.json(await listEventsForUser(session.user.id));
  } catch (error) {
    log.exception("Error fetching events", error, { route: "api/events" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
