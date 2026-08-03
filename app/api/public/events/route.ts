// import { db } from "@/lib/mongo";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { slug } = body;

//     if (!slug || typeof slug !== "string") {
//       return new Response("Invalid slug", { status: 400 });
//     }

//     const client = await db;
//     const usersCollection = client.db().collection("users");
//     const eventsCollection = client.db().collection("events");

//     // Find user by slug
//     const user = await usersCollection.findOne({ orgUrl: slug });

//     if (!user) {
//       return new Response("User not found", { status: 404 });
//     }

//     // Find events for this user
//     const events = await eventsCollection.find({ userId: user._id }).toArray();

//     // Format the response
//     const response = {
//       name: user.orgName,
//       avatar: user.avatar || "/placeholder-user.jpg",
//       events: events.map((event) => ({
//         id: event._id.toString(),
//         title: event.title,
//         location: event.location,
//         date: event.date,
//         isNew: event.isNew || false,
//         isPopular: event.isPopular || false,
//       })),
//     };

//     return new Response(JSON.stringify(response), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching user events:", error);
//     return new Response("Internal server error", { status: 500 });
//   }
// }
import { db } from "@/lib/mongo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug } = body;

    if (!slug || typeof slug !== "string") {
      return new Response("Invalid slug", { status: 400 });
    }

    const client = await db;
    const usersCollection = client.db().collection("users");
    const eventsCollection = client.db().collection("events");

    // Find user by slug
    const user = await usersCollection.findOne({ orgUrl: slug });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Find events for this user
    const events = await eventsCollection.find({ userId: user._id }).toArray();

    // Format the response
    const response = {
      name: user.orgName || "N/A",
      avatar: user.avatar || "/placeholder-user.jpg",
      events: events.map((event) => {
        // Find the earliest date from timings array
        const earliestDate =
          event.timings && event.timings.length > 0
            ? event.timings.reduce((earliest: any, current: any) => {
                const currentDate = new Date(current.date);
                return earliest < currentDate ? earliest : currentDate;
              }, new Date(event.timings[0].date))
            : "N/A";

        return {
          id: event._id.toString(),
          title: event.eventName || "N/A",
          location: event.venue?.venueName || "N/A",
          date: earliestDate !== "N/A" ? earliestDate.toISOString() : "N/A",
          isNew: event.isNew || false,
          isPopular: event.isPopular || false,
          eventFlyer: event.eventFlyer,
        };
      }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching user events:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
