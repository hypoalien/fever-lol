// app/api/public/events/[eventId]/route.ts

import { db } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET(req: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {


    const { eventId } = params;
    if (!eventId || typeof eventId !== "string") {
      return new Response("Invalid Event ID", { status: 400 });
    }

    const client = await db;
    const eventsCollection = client.db().collection("events");
    const usersCollection = client.db().collection("users");

    // Fetch event details
    const event = await eventsCollection.findOne({
      _id: new ObjectId(eventId),
    });

    if (!event) {
      return new Response("Event not found", { status: 404 });
    }

    // Fetch host details from users collection
    const host = await usersCollection.findOne({
      _id: new ObjectId(event.userId as string),
    });
    if (!host) {
      return new Response("Event host not found", { status: 404 });
    }

    // Calculate remaining tickets for each variant
    const ticketVariants = event.ticketVariants.map((variant: any) => ({
      ...variant,
      remaining: parseInt(variant.quantity), // You might want to calculate actual remaining based on bookings
    }));

    // Format response
    const formattedResponse = {
      _id: event._id,
      eventName: event.eventName,
      eventDescription: event.eventDescription,
      eventFlyer: event.eventFlyer,
      timings: event.timings.map((timing: any) => ({
        date: timing.date,
        startTime: timing.startTime,
        endTime: timing.endTime,
      })),
      eventId: eventId,
      paymentGatewayFee: event.paymentGatewayFee,
      platformFee: event.platformFee,
      ticketVariants: ticketVariants,
      venue: event.venue,
      hostEmail: host.email, // Assuming email exists in user document
      currency: host.currency,
    };

    return new Response(JSON.stringify(formattedResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching event details:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
