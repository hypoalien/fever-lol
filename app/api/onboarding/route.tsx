import { auth } from "@/auth";
import { currencyOf } from "@/lib/currency";
import { db } from "@/lib/mongo";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    const body = await req.json();
    const { firstName, lastName, email, orgName, orgUrl, currency } = body;

    const client = await db;
    const collection = client.db().collection("users");

    const existingUser = await collection.findOne({ orgUrl });
    if (existingUser && existingUser._id.toString() !== userId) {
      return new Response("Organization URL already taken", { status: 400 });
    }

    // If user already has a currency, don't update it
    const updateFields: any = {
      firstName,
      lastName,
      email,
      orgName,
      orgUrl,
      updatedAt: new Date(),
    };

    // Only set currency if it's not already set in the session
    if (!currencyOf(session.user)) {
      updateFields.currency = currency;
    }

    await collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: updateFields,
      },
      { upsert: true }
    );

    return new Response("Profile updated successfully", { status: 200 });
  } catch (error) {
    console.error("Error updating profile:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

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
    const collection = client.db().collection("users");
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
