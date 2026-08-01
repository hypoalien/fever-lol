import { auth } from "@/auth";
import { db } from "@/lib/mongo";
import { ObjectId } from "mongodb";
export async function POST(req: Request) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    // Parse request body
    const body = await req.json();
    const { eventId } = body;

    const client = await db;
    const collection = client.db().collection("orders");

    let query = {};

    // If eventId is provided, search for specific event orders
    if (eventId) {
      query = {
        eventId: eventId,
        organizerId: new ObjectId(userId),
      };
    } else {
      // If no eventId, get all orders for the user
      query = {
        organizerId: new ObjectId(userId),
      };
    }

    const orders = await collection
      .find(query)
      .sort({ orderDate: -1 }) // Sort by order date descending
      .toArray();

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No orders found",
          orders: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Orders fetched successfully",
        orders: orders,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
