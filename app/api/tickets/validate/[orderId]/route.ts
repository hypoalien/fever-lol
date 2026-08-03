import { ticketsForOrder } from "@/lib/data/tickets";
import { requireUser } from "@/lib/session";

/** All tickets on an order, for check-in at the door. */
export async function GET(
  _req: Request,
  props: { params: Promise<{ orderId: string }> }
) {
  const session = await requireUser();
  if (!session.ok) return session.response;

  const { orderId } = await props.params;

  try {
    const results = await ticketsForOrder(orderId, session.user.id);
    if (!results) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    return Response.json({ orderNumber: orderId, tickets: results });
  } catch (error) {
    console.error("Error fetching order tickets:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
