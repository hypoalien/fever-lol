import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ObjectId } from "mongodb";
import { parseISO } from "date-fns";

// Helper function to normalize date for comparison
function normalizeDateForComparison(date: Date | string) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

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
    const events = await collection
      .find({ userId: new ObjectId(userId) })
      .toArray();

    // Process events to update status based on dates
    const normalizedCurrentDate = normalizeDateForComparison(new Date());

    const processedEvents = events.map((event) => {
      // If status is draft or empty, keep it as draft
      if (!event.status || event.status === "draft") {
        return { ...event };
      }

      // If status is active, check dates
      if (event.status === "active" && event.timings?.length) {
        const earliestDate = new Date(
          Math.min(
            ...event.timings.map((t: any) => {
              const normalizedDate = normalizeDateForComparison(t.date);
              return normalizedDate.getTime();
            })
          )
        );

        // Compare earliest date with current date
        if (normalizeDateForComparison(earliestDate) < normalizedCurrentDate) {
          return { ...event, status: "completed" };
        }
      }

      return { ...event };
    });

    return new Response(JSON.stringify(processedEvents), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
