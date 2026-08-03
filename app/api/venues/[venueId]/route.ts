import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PUT(req: Request, props: { params: Promise<{ venueId: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    const { venueId } = params;
    const body = await req.json();

    const client = await db;
    const collection = client.db().collection("venues");

    const venue = await collection.findOne({
      _id: new ObjectId(venueId),
      userId: userId,
    });

    if (!venue) {
      return new Response("Venue not found", { status: 404 });
    }

    const updatedVenue = {
      ...body,
      updatedAt: new Date(),
    };

    await collection.updateOne(
      { _id: new ObjectId(venueId) },
      { $set: updatedVenue }
    );

    const result = await collection.findOne({ _id: new ObjectId(venueId) });
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    console.error("Error updating venue:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ venueId: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    const { venueId } = params;

    const client = await db;
    const collection = client.db().collection("venues");

    const venue = await collection.findOne({
      _id: new ObjectId(venueId),
      userId: userId,
    });

    if (!venue) {
      return new Response("Venue not found", { status: 404 });
    }

    await collection.deleteOne({ _id: new ObjectId(venueId) });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting venue:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
