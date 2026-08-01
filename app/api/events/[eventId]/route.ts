import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return new Response("Invalid UserId", { status: 400 });
    }

    const { eventId } = params;

    if (!eventId) {
      return new Response("Event ID is required", { status: 400 });
    }

    const client = await db;
    const collection = client.db().collection("events");

    const event = await collection.findOne({
      _id: new ObjectId(eventId),
      userId: new ObjectId(userId),
    });

    if (!event) {
      return new Response("Event not found", { status: 404 });
    }

    return new Response(JSON.stringify(event), { status: 200 });
  } catch (error) {
    console.error("Error fetching event:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return new Response("Invalid UserId", { status: 400 });
    }

    const { eventId } = params;
    const eventData = await req.json();

    const client = await db;
    const collection = client.db().collection("events");

    if (eventId) {
      // Update existing event
      const result = await collection.updateOne(
        {
          _id: new ObjectId(eventId),
          userId: new ObjectId(userId),
        },
        {
          $set: {
            ...eventData,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return new Response("Event not found", { status: 404 });
      }

      return new Response(
        JSON.stringify({ message: "Event updated successfully" }),
        { status: 200 }
      );
    } else {
      // Create new event
      const newEvent = {
        ...eventData,
        userId: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(newEvent);

      return new Response(
        JSON.stringify({
          message: "Event created successfully",
          eventId: result.insertedId,
        }),
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error saving event:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return new Response("Invalid UserId", { status: 400 });
    }

    const { eventId } = params;
    if (!eventId) {
      return new Response("Event ID is required", { status: 400 });
    }

    const client = await db;
    const collection = client.db().collection("events");

    const result = await collection.deleteOne({
      _id: new ObjectId(eventId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return new Response("Event not found", { status: 404 });
    }

    return new Response(
      JSON.stringify({ message: "Event deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting event:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
