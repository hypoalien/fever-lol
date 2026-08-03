import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { checkInTicket } from "@/lib/data/tickets";
import { requireUser } from "@/lib/session";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServer } from "@/lib/analytics/server";

const BodySchema = z.object({ ticketId: z.string().trim().min(1).max(200) });

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const result = await checkInTicket(parsed.data.ticketId, session.user.id);

    trackServer(ANALYTICS_EVENTS.ticketScanned, session.user.id, {
      eventId: "ticket" in result ? result.ticket.id : "",
      outcome:
        result.outcome === "checked-in"
          ? "admitted"
          : result.outcome === "already-used"
            ? "already_used"
            : "not_found",
    });

    switch (result.outcome) {
      case "not-found":
        return Response.json(
          { success: false, message: "Ticket not found" },
          { status: 404 }
        );
      case "forbidden":
        // Deliberately the same message as not-found, so scanning cannot be
        // used to probe which codes exist on other organizers' events.
        return Response.json(
          { success: false, message: "Ticket not found" },
          { status: 404 }
        );
      case "already-used":
        return Response.json({
          success: false,
          message: "This ticket has already been used",
          ticket: result.ticket,
        });
      case "checked-in":
        return Response.json({
          success: true,
          message: "Ticket validated successfully",
          ticket: result.ticket,
        });
    }
  } catch (error) {
    console.error("Error validating ticket:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
