import { z } from "zod";

import { invalidRequest } from "@/lib/api";
import { listOrders } from "@/lib/data/analytics";
import { requireUser } from "@/lib/session";
import { log } from "@/lib/log";

const BodySchema = z.object({ eventId: z.string().uuid().optional() });

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return invalidRequest(parsed.error);

  try {
    const orders = await listOrders(session.user.id, parsed.data.eventId);
    return Response.json({ orders });
  } catch (error) {
    log.exception("Error fetching orders", error, { route: "api/orders" });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
