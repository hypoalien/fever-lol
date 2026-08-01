// // app/api/tickets/validate/[orderId]/route.ts

// import { auth } from "@/auth";
// import { db } from "@/lib/mongo";

// export async function GET(
//   req: Request,
//   { params }: { params: { orderId: string } }
// ) {
//   try {
//     // Verify authentication
//     const session = await auth();
//     if (!session) {
//       return new Response("Unauthorized", { status: 403 });
//     }

//     const orderId = params.orderId;
//     if (!orderId) {
//       return new Response("Order ID is required", { status: 400 });
//     }

//     const client = await db;
//     const ticketsCollection = client.db().collection("tickets");

//     // Find all tickets for the given orderId
//     const tickets = await ticketsCollection
//       .find({ orderId: orderId })
//       .toArray();

//     if (!tickets || tickets.length === 0) {
//       return new Response("No tickets found for this order", { status: 404 });
//     }

//     // Validate each ticket and add validation info
//     const validatedTickets = tickets.map((ticket) => {
//       const isValid = validateTicket(ticket);
//       return {
//         ...ticket,
//         validation: {
//           isValid,
//           validatedAt: new Date().toISOString(),
//           message: isValid
//             ? "Ticket is valid"
//             : "Ticket is invalid or has been used",
//         },
//       };
//     });

//     return new Response(JSON.stringify(validatedTickets), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//   } catch (error) {
//     console.error("Error validating tickets:", error);
//     return new Response("Internal server error", { status: 500 });
//   }
// }

// // Helper function to validate a ticket
// function validateTicket(ticket: any) {
//   // Add your validation logic here
//   // For example:
//   return (
//     ticket.status === "active" &&
//     ticket.qrCode &&
//     new Date(ticket.createdAt) <= new Date()
//   );
// }
// app/api/tickets/validate/[orderId]/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/mongo";

export async function GET(req: Request, props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  try {
    // Verify authentication
    const session = await auth();
    if (!session) {
      return new Response("Unauthorized", { status: 403 });
    }

    const orderId = params.orderId;
    if (!orderId) {
      return new Response("Order ID is required", { status: 400 });
    }

    const client = await db;
    const ticketsCollection = client.db().collection("tickets");

    // Find all tickets for the given orderId
    const tickets = await ticketsCollection
      .find({ orderId: orderId })
      .toArray();

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No tickets found for this order",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate and update tickets
    const validatedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        // Check if ticket has been used (has checkedIn time)
        if (ticket.checkedInTime) {
          return {
            ...ticket,
            validation: {
              isValid: false,
              validatedAt: ticket.checkedInTime,
              message: "Ticket has already been used",
            },
          };
        }

        // If ticket hasn't been used, update checkedInTime
        const updateResult = await ticketsCollection.updateOne(
          { _id: ticket._id },
          {
            $set: {
              status: "used",
              checkedInTime: new Date().toISOString(),
              checkedInBy: session.user?.id || "unknown",
            },
          }
        );

        return {
          ...ticket,
          checkedInTime: new Date().toISOString(),
          validation: {
            isValid: true,
            validatedAt: new Date().toISOString(),
            message: "Ticket validated successfully",
            updateStatus:
              updateResult.modifiedCount === 1 ? "success" : "failed",
          },
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        tickets: validatedTickets,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error validating tickets:", error);
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
