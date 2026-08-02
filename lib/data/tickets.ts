import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { events, orders, tickets } from "@/lib/db/schema";

export interface TicketView {
  id: string;
  code: string;
  type: string;
  status: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  eventName: string | null;
  orderNumber: string;
  checkedInAt: string | null;
}

export type CheckInResult =
  | { outcome: "checked-in"; ticket: TicketView }
  | { outcome: "already-used"; ticket: TicketView }
  | { outcome: "not-found" }
  | { outcome: "forbidden" };

/**
 * Admit a ticket.
 *
 * Two fixes over the previous implementation:
 *
 *  - The read and the write are a single guarded UPDATE. Before, the handler
 *    read the ticket, checked whether it had been used, then wrote — so two
 *    simultaneous scans of the same QR code could both be admitted.
 *  - Only the organizer of the event may check a ticket in. Previously any
 *    signed-in user could admit anyone's attendees.
 */
export async function checkInTicket(
  code: string,
  scannedByUserId: string
): Promise<CheckInResult> {
  const [existing] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      type: tickets.type,
      status: tickets.status,
      attendeeName: tickets.attendeeName,
      attendeeEmail: tickets.attendeeEmail,
      checkedInAt: tickets.checkedInAt,
      eventName: events.eventName,
      organizerId: events.userId,
      orderNumber: orders.orderNumber,
    })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .where(eq(tickets.code, code));

  if (!existing) return { outcome: "not-found" };
  if (existing.organizerId !== scannedByUserId) return { outcome: "forbidden" };

  const view = (checkedInAt: Date | null): TicketView => ({
    id: existing.id,
    code: existing.code,
    type: existing.type,
    status: checkedInAt ? "checked_in" : existing.status,
    attendeeName: existing.attendeeName,
    attendeeEmail: existing.attendeeEmail,
    eventName: existing.eventName,
    orderNumber: existing.orderNumber,
    checkedInAt: checkedInAt?.toISOString() ?? null,
  });

  // Only transitions an active, not-yet-scanned ticket. A second concurrent
  // scan matches zero rows and is reported as already used.
  const [admitted] = await db
    .update(tickets)
    .set({
      status: "checked_in",
      checkedInAt: new Date(),
      checkedInBy: scannedByUserId,
    })
    .where(
      and(
        eq(tickets.code, code),
        eq(tickets.status, "active"),
        isNull(tickets.checkedInAt)
      )
    )
    .returning({ checkedInAt: tickets.checkedInAt });

  if (!admitted) return { outcome: "already-used", ticket: view(existing.checkedInAt) };
  return { outcome: "checked-in", ticket: view(admitted.checkedInAt) };
}

/** Every ticket on an order, for the door staff view. */
export async function ticketsForOrder(
  orderNumber: string,
  organizerId: string
): Promise<TicketView[] | null> {
  const [order] = await db
    .select({ id: orders.id, organizerId: orders.organizerId })
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber));

  if (!order) return null;
  if (order.organizerId !== organizerId) return null;

  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      type: tickets.type,
      status: tickets.status,
      attendeeName: tickets.attendeeName,
      attendeeEmail: tickets.attendeeEmail,
      checkedInAt: tickets.checkedInAt,
      eventName: events.eventName,
    })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(eq(tickets.orderId, order.id));

  return rows.map((row) => ({
    ...row,
    orderNumber,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
  }));
}

/** Attendee list for the dashboard, optionally narrowed to one event. */
export async function listAttendees(organizerId: string, eventId?: string) {
  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      type: tickets.type,
      status: tickets.status,
      name: tickets.attendeeName,
      email: tickets.attendeeEmail,
      phone: tickets.attendeePhone,
      checkedInAt: tickets.checkedInAt,
      eventId: tickets.eventId,
      eventName: events.eventName,
      orderNumber: orders.orderNumber,
      purchasedAt: orders.createdAt,
    })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .where(
      eventId
        ? and(eq(events.userId, organizerId), eq(tickets.eventId, eventId))
        : eq(events.userId, organizerId)
    )
    .orderBy(sql`${orders.createdAt} desc`);

  return rows.map((row) => ({
    ...row,
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    purchasedAt: row.purchasedAt.toISOString(),
  }));
}
