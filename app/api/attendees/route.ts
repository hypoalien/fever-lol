import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";
import { z } from "zod";

// Interfaces
interface RequestBody {
  eventId?: string;
}

interface Ticket {
  _id: ObjectId;
  orderId: string;
  eventId: string;
  ticketType: string;
  price: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  qrCode: string;
  createdAt: string;
  updatedAt: string;
  checkedInTime: string | null;
}

interface Event {
  _id: ObjectId;
  eventName: string;
  userId: ObjectId;
}

interface FormattedTicket {
  _id: string;
  ticketType: string;
  customerName: string;
  createdAt: string;
  email: string;
  numberOfTickets: number;
  eventId: string;
  eventName: string;
  attendeeId: string;
  orderId: string;
  checkedIn: boolean;
  checkedInTime: string | null;
}

// Zod Schema
const AttendeesInfoSchema = z.object({
  _id: z.string(),
  ticketType: z.string(),
  customerName: z.string().default(" "),
  createdAt: z.string().datetime(),
  email: z.string().default(""),
  numberOfTickets: z.number(),
  eventId: z.string(),
  eventName: z.string().default("N/A"),
  attendeeId: z.string(),
  orderId: z.string().default("N/A"),
  checkedIn: z.boolean().default(false),
  checkedInTime: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 403 });
    }

    const userId = session.user?.id;
    if (!userId || typeof userId !== "string") {
      return new Response("Invalid UserId", { status: 400 });
    }

    const body: RequestBody = await req.json();
    const { eventId } = body;

    const client = await db;
    const eventsCollection = client.db().collection<Event>("events");
    const ticketsCollection = client.db().collection<Ticket>("tickets");

    let tickets: Ticket[] = [];

    if (eventId) {
      // If eventId is provided, fetch tickets for that specific event
      const event = await eventsCollection.findOne({
        _id: new ObjectId(eventId),
        userId: new ObjectId(userId),
      });

      if (!event) {
        return new Response("Event not found or unauthorized", { status: 404 });
      }

      tickets = await ticketsCollection
        .find({
          eventId: eventId,
        })
        .toArray();
    } else {
      // If no eventId, fetch all tickets for events owned by the user
      const userEvents = await eventsCollection
        .find({
          userId: new ObjectId(userId),
        })
        .toArray();

      const eventIds = userEvents.map((event) => event._id.toString());

      tickets = await ticketsCollection
        .find({
          eventId: { $in: eventIds },
        })
        .toArray();
    }

    // Transform tickets to match the AttendeesInfoSchema
    const formattedTickets: FormattedTicket[] = tickets.map((ticket) => ({
      _id: ticket._id.toString(),
      ticketType: ticket.ticketType,
      customerName: ticket.customerName || " ",
      createdAt: ticket.createdAt,
      email: ticket.customerEmail || "",
      numberOfTickets: 1, // Assuming 1 ticket per record
      eventId: ticket.eventId,
      eventName: "", // Will be populated below
      attendeeId: ticket.qrCode,
      orderId: ticket.orderId,
      checkedIn: ticket.checkedInTime ? true : false, //change this
      checkedInTime: ticket.checkedInTime,
      status: ticket.status,
    }));

    // Fetch event names for all tickets
    const uniqueEventIds = Array.from(
      new Set(formattedTickets.map((ticket) => ticket.eventId))
    );
    const events = await eventsCollection
      .find({
        _id: { $in: uniqueEventIds.map((id) => new ObjectId(id as string)) },
      })
      .toArray();

    // Create event name lookup
    const eventNameMap: { [key: string]: string } = events.reduce(
      (acc, event) => {
        acc[event._id.toString()] = event.eventName;
        return acc;
      },
      {} as { [key: string]: string }
    );

    // Add event names to formatted tickets
    formattedTickets.forEach((ticket) => {
      ticket.eventName = eventNameMap[ticket.eventId] || "N/A";
    });

    // Validate the response using Zod schema
    const validatedTickets = formattedTickets.map((ticket) =>
      AttendeesInfoSchema.parse(ticket)
    );

    return new Response(JSON.stringify(validatedTickets), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    if (error instanceof z.ZodError) {
      return new Response("Invalid data format", { status: 422 });
    }
    return new Response("Internal server error", { status: 500 });
  }
}
