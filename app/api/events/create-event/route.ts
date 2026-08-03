import { createDraftEvent } from "@/lib/data/events";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

export async function POST() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    const event = await createDraftEvent(session.user.id);
    return Response.json(
      { id: event.id, userId: event.userId, status: event.status },
      { status: 201 }
    );
  } catch (error) {
    log.exception("Error creating event", error, { route: "api/events/create-event" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
