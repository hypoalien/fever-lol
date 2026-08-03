import {
  EventUpdateSchema,
  EventWriteError,
  updateOwnedEvent,
} from "@/lib/data/event-write";
import { deleteOwnedEvent, findOwnedEvent } from "@/lib/data/events";
import { requireUser } from "@/lib/session";
import { invalidRequest } from "@/lib/api";

export async function GET(
  _req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { eventId } = await props.params;

  try {
    const event = await findOwnedEvent(eventId, session.user.id);
    if (!event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { eventId } = await props.params;

  const parsed = EventUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return invalidRequest(parsed.error, "Invalid event");
  }

  try {
    await updateOwnedEvent(eventId, session.user.id, parsed.data);
    return Response.json({ message: "Event updated successfully" });
  } catch (error) {
    if (error instanceof EventWriteError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Error saving event:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ eventId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { eventId } = await props.params;

  try {
    const deleted = await deleteOwnedEvent(eventId, session.user.id);
    if (!deleted) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }
    return Response.json({ message: "Event deleted successfully" });
  } catch (error) {
    // The orders foreign key is RESTRICT, so an event that has sold tickets
    // cannot be removed. Say why rather than returning a bare 500.
    if (
      error instanceof Error &&
      error.message.includes("orders_event_id_events_id_fk")
    ) {
      return Response.json(
        { error: "This event has orders against it and cannot be deleted" },
        { status: 409 }
      );
    }
    console.error("Error deleting event:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
