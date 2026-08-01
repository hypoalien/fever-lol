import { auth } from "@/auth";
import { currencyOrDefault } from "@/lib/currency";
import { db } from "@/lib/db";
import {
  startOfDay,
  subDays,
  startOfMonth,
  subMonths,
  endOfMonth,
} from "date-fns";
import { ObjectId } from "mongodb";

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
    const ordersCollection = client.db().collection("orders");
    const eventsCollection = client.db().collection("events");

    // Get current date references
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const currentMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));

    // Calculate total revenue
    const currentMonthOrders = await ordersCollection
      .find({
        organizerId: new ObjectId(userId),
        orderStatus: { $ne: "failed" },
        orderDate: {
          $gte: currentMonth.toISOString(),
        },
      })
      .toArray();

    const lastMonthOrders = await ordersCollection
      .find({
        organizerId: new ObjectId(userId),
        orderStatus: { $ne: "failed" },
        orderDate: {
          $gte: lastMonth.toISOString(),
          $lt: currentMonth.toISOString(),
        },
      })
      .toArray();

    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmountPaid) || 0),
      0
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmountPaid) || 0),
      0
    );
    const revenuePercentageChange = lastMonthRevenue
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Calculate sales today
    const todayOrders = await ordersCollection
      .find({
        organizerId: new ObjectId(userId),
        orderStatus: { $ne: "failed" },
        orderDate: {
          $gte: today.toISOString(),
        },
      })
      .toArray();

    const yesterdayOrders = await ordersCollection
      .find({
        organizerId: new ObjectId(userId),
        orderStatus: { $ne: "failed" },
        orderDate: {
          $gte: yesterday.toISOString(),
          $lt: today.toISOString(),
        },
      })
      .toArray();

    const todaySales = todayOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmountPaid) || 0),
      0
    );
    const yesterdaySales = yesterdayOrders.reduce(
      (sum, order) => sum + (Number(order.totalAmountPaid) || 0),
      0
    );
    const salesPercentageChange = yesterdaySales
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
      : 0;

    // Calculate tickets sold
    const currentMonthTickets = currentMonthOrders.reduce(
      (sum, order) =>
        sum +
        order.ticketDetails.reduce(
          (tSum: number, ticket: any) => tSum + (Number(ticket.quantity) || 0),
          0
        ),
      0
    );
    const lastMonthTickets = lastMonthOrders.reduce(
      (sum, order) =>
        sum +
        order.ticketDetails.reduce(
          (tSum: number, ticket: any) => tSum + (Number(ticket.quantity) || 0),
          0
        ),
      0
    );
    const ticketsPercentageChange = lastMonthTickets
      ? ((currentMonthTickets - lastMonthTickets) / lastMonthTickets) * 100
      : 0;

    // Get active events
    const currentActiveEvents = await eventsCollection.countDocuments({
      userId: new ObjectId(userId),
      status: "active",
      "timings.date": { $gte: new Date().toISOString() },
    });

    const lastMonthActiveEvents = await eventsCollection.countDocuments({
      userId: new ObjectId(userId),
      status: "active",
      "timings.date": {
        $gte: lastMonth.toISOString(),
        $lt: currentMonth.toISOString(),
      },
    });

    // Get recent sales
    const recentSales = await ordersCollection
      .find({
        organizerId: new ObjectId(userId),
        orderStatus: { $ne: "failed" },
      })
      .sort({ orderDate: -1 })
      .limit(5)
      .project({
        id: "$_id",
        name: "$customerName",
        email: "$customerEmail",
        amount: "$totalAmountPaid",
        date: "$orderDate",
      })
      .toArray();

    // Calculate monthly overview
    const monthlyOverview = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthStart = startOfMonth(subMonths(new Date(), 11 - i));
        const monthEnd = endOfMonth(monthStart);

        const monthRevenue = await ordersCollection
          .aggregate([
            {
              $match: {
                organizerId: new ObjectId(userId),
                orderStatus: { $ne: "failed" },
                orderDate: {
                  $gte: monthStart.toISOString(),
                  $lte: monthEnd.toISOString(),
                },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $toDouble: "$totalAmountPaid" } },
              },
            },
          ])
          .toArray();

        return {
          name: monthStart.toLocaleString("default", { month: "short" }),
          total: monthRevenue[0]?.total || 0,
        };
      })
    );

    const dashboardData = {
      totalRevenue: {
        amount: currentMonthRevenue,
        percentageChange: revenuePercentageChange,
      },
      salesToday: {
        amount: todaySales,
        percentageChange: salesPercentageChange,
      },
      ticketsSold: {
        count: currentMonthTickets,
        percentageChange: ticketsPercentageChange,
      },
      activeEvents: {
        count: currentActiveEvents,
        percentageChange: currentActiveEvents - lastMonthActiveEvents,
      },
      overview: monthlyOverview,
      recentSales: recentSales.map((sale) => ({
        ...sale,
        avatar: `/avatars/0${Math.floor(Math.random() * 5) + 1}.png`,
      })),
      currency: currencyOrDefault(session.user),
    };

    return new Response(JSON.stringify(dashboardData), { status: 200 });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
