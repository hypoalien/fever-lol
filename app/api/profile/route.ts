import { auth } from "@/auth";
import { db } from "@/lib/db";
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
    const {
      firstName,
      lastName,
      email,
      phone,
      orgName,
      orgDescription,
      orgUrl,
      ctaUrl,
      currency,
    } = body;

    const client = await db;
    const collection = client.db().collection("users");

    // Check if orgUrl is already taken by another user
    const existingUser = await collection.findOne({
      orgUrl,
      _id: { $ne: new ObjectId(userId) },
    });

    if (existingUser) {
      return new Response("Organization URL already taken", { status: 400 });
    }

    await collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          firstName,
          lastName,
          email,
          phone,
          orgName,
          orgDescription,
          orgUrl,
          ctaUrl,
          currency,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return Response.json({ message: "Profile updated successfully" });
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

    const user = await collection.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          orgName: 1,
          orgDescription: 1,
          orgUrl: 1,
          ctaUrl: 1,
          currency: 1,
        },
      }
    );

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    return Response.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
