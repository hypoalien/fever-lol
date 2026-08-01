import { auth } from "@/auth";
import { db } from "@/lib/mongo";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    const client = await db;
    const collection = client.db().collection("venues");
    const venues = await collection.find({ userId: userId }).toArray();
    return new Response(
      JSON.stringify(
        venues.map((venue) => ({
          id: venue._id.toString(),
          ...venue,
        }))
      ),
      { status: 200 }
    );
    // return new Response(JSON.stringify(venues), { status: 200 });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    const body = await req.json();

    const client = await db;
    const collection = client.db().collection("venues");

    const venue = {
      ...body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(venue);
    const newVenue = await collection.findOne({ _id: result.insertedId });

    // return new Response(JSON.stringify(newVenue), { status: 201 });
    return new Response(
      JSON.stringify({
        ...newVenue,
        id: newVenue?._id.toString(), // Add id field
        _id: newVenue?._id.toString(), // Keep _id for backward compatibility
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating venue:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
