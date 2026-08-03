import { and, count, eq, gte, lt, ne, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { events, orderItems, orders } from "@/lib/db/schema";

/**
 * Dashboard figures.
 *
 * The previous version pulled whole order documents into memory and reduced
 * over them in JavaScript, once per window, plus one aggregate per month —
 * fourteen round trips. These are aggregates in the database instead.
 */

export interface DashboardData {
  currency: string;
  totalRevenue: { amountMinor: number; percentageChange: number };
  salesToday: { amountMinor: number; percentageChange: number };
  ticketsSold: { count: number; percentageChange: number };
  activeEvents: { count: number; change: number };
  overview: Array<{ name: string; totalMinor: number }>;
  recentSales: Array<{
    id: string;
    name: string;
    email: string;
    amountMinor: number;
    date: string;
  }>;
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/** Revenue and order count for one organizer within a window. */
async function revenueBetween(
  organizerId: string,
  from: Date,
  to?: Date
): Promise<number> {
  const [row] = await db
    .select({ total: sum(orders.totalMinor).mapWith(Number) })
    .from(orders)
    .where(
      and(
        eq(orders.organizerId, organizerId),
        ne(orders.orderStatus, "cancelled"),
        gte(orders.createdAt, from),
        ...(to ? [lt(orders.createdAt, to)] : [])
      )
    );
  return row?.total ?? 0;
}

async function ticketsBetween(
  organizerId: string,
  from: Date,
  to?: Date
): Promise<number> {
  const [row] = await db
    .select({ total: sum(orderItems.quantity).mapWith(Number) })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.organizerId, organizerId),
        ne(orders.orderStatus, "cancelled"),
        gte(orders.createdAt, from),
        ...(to ? [lt(orders.createdAt, to)] : [])
      )
    );
  return row?.total ?? 0;
}

export async function getDashboardData(
  organizerId: string,
  currency: string
): Promise<DashboardData> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    monthRevenue,
    lastMonthRevenue,
    todayRevenue,
    yesterdayRevenue,
    monthTickets,
    lastMonthTickets,
    activeNow,
    monthlyRows,
    recent,
  ] = await Promise.all([
    revenueBetween(organizerId, startOfMonth),
    revenueBetween(organizerId, startOfLastMonth, startOfMonth),
    revenueBetween(organizerId, startOfToday),
    revenueBetween(organizerId, startOfYesterday, startOfToday),
    ticketsBetween(organizerId, startOfMonth),
    ticketsBetween(organizerId, startOfLastMonth, startOfMonth),
    db
      .select({ total: count() })
      .from(events)
      .where(and(eq(events.userId, organizerId), eq(events.status, "active")))
      .then((rows) => rows[0]?.total ?? 0),
    // One grouped query for the whole year rather than twelve separate ones.
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'YYYY-MM')`,
        total: sum(orders.totalMinor).mapWith(Number),
      })
      .from(orders)
      .where(
        and(
          eq(orders.organizerId, organizerId),
          ne(orders.orderStatus, "cancelled"),
          gte(orders.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`date_trunc('month', ${orders.createdAt})`),
    db
      .select({
        id: orders.id,
        name: orders.customerName,
        email: orders.customerEmail,
        amountMinor: orders.totalMinor,
        date: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.organizerId, organizerId))
      .orderBy(sql`${orders.createdAt} desc`)
      .limit(5),
  ]);

  const byMonth = new Map(monthlyRows.map((row) => [row.month, row.total ?? 0]));
  const overview = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    return {
      name: month.toLocaleString("en-US", { month: "short" }),
      totalMinor: byMonth.get(key) ?? 0,
    };
  });

  return {
    currency,
    totalRevenue: {
      amountMinor: monthRevenue,
      percentageChange: percentageChange(monthRevenue, lastMonthRevenue),
    },
    salesToday: {
      amountMinor: todayRevenue,
      percentageChange: percentageChange(todayRevenue, yesterdayRevenue),
    },
    ticketsSold: {
      count: monthTickets,
      percentageChange: percentageChange(monthTickets, lastMonthTickets),
    },
    activeEvents: { count: activeNow, change: 0 },
    overview,
    recentSales: recent.map((sale) => ({
      id: sale.id,
      name: sale.name,
      email: sale.email,
      amountMinor: sale.amountMinor,
      date: sale.date.toISOString(),
    })),
  };
}

/** Orders for the dashboard table, optionally narrowed to one event. */
export async function listOrders(organizerId: string, eventId?: string) {
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      currency: orders.currency,
      subtotalMinor: orders.subtotalMinor,
      discountMinor: orders.discountMinor,
      totalMinor: orders.totalMinor,
      payoutMinor: orders.payoutMinor,
      paymentStatus: orders.paymentStatus,
      orderStatus: orders.orderStatus,
      payoutStatus: orders.payoutStatus,
      eventId: orders.eventId,
      eventName: events.eventName,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(events, eq(events.id, orders.eventId))
    .where(
      eventId
        ? and(eq(orders.organizerId, organizerId), eq(orders.eventId, eventId))
        : eq(orders.organizerId, organizerId)
    )
    .orderBy(sql`${orders.createdAt} desc`);

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
