import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { listAttendees } from "@/lib/data/tickets";
import { requireUser } from "@/lib/session";

const BodySchema = z.object({ eventId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const attendees = await listAttendees(session.user.id, parsed.data.eventId);
    return Response.json({ attendees });
  } catch (error) {
    console.error("Error fetching attendees:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
