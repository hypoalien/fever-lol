import { listPromoCodes } from "@/lib/data/events";
import { log } from "@/lib/log";
import { requireUser } from "@/lib/session";

/** Every promo code across the organizer's events. */
export async function GET() {
  const session = await requireUser();
  if (!session.ok) return session.response;

  try {
    return Response.json({ promoCodes: await listPromoCodes(session.user.id) });
  } catch (error) {
    log.exception("Error fetching promo codes", error, {
      route: "api/discounts",
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
