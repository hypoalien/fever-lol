// app/api/tickets/validate/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/mongo";

export async function POST(req: Request) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ticket ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const client = await db;
    const ticketsCollection = client.db().collection("tickets");

    // Find ticket by qrCode
    const ticket = await ticketsCollection.findOne({ qrCode: ticketId });

    if (!ticket) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ticket not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if ticket has been used
    if (ticket.checkedInTime) {
      return new Response(
        JSON.stringify({
          success: false,
          ticket: {
            ...ticket,
            validation: {
              isValid: false,
              validatedAt: ticket.checkedInTime,
              message: "Ticket has already been used",
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update ticket with check-in information
    const updateResult = await ticketsCollection.updateOne(
      { qrCode: ticketId },
      {
        $set: {
          status: "used",
          checkedInTime: new Date().toISOString(),
          checkedInBy: session.user?.id || "unknown",
        },
      }
    );

    const updatedTicket = {
      ...ticket,
      checkedInTime: new Date().toISOString(),
      validation: {
        isValid: true,
        validatedAt: new Date().toISOString(),
        message: "Ticket validated successfully",
        updateStatus: updateResult.modifiedCount === 1 ? "success" : "failed",
      },
    };

    return new Response(
      JSON.stringify({
        success: true,
        ticket: updatedTicket,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error validating ticket:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
