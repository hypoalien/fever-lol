import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function POST() {
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
    const collection = client.db().collection("events");

    const newEvent = {
      userId: new ObjectId(userId),
      status: "draft",
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newEvent);

    return new Response(
      JSON.stringify({
        _id: result.insertedId,
        userId: userId,
        status: "draft",
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
