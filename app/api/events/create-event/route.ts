import { createDraftEvent } from "@/lib/data/events";
import { requireUser } from "@/lib/session";

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
    console.error("Error creating event:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
