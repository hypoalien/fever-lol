import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  eventTimings,
  events,
  promoCodes,
  ticketVariants,
  venues,
  type Event,
  type EventTiming,
  type PromoCode,
  type TicketVariant,
  type Venue,
} from "@/lib/db/schema";

/**
 * Event reads and writes.
 *
 * Routes stay thin by delegating here, and the shapes below are the contract
 * the client sees — no raw rows leak out with database-shaped field names.
 */

export interface EventWithDetails {
  id: string;
  eventName: string | null;
  slug: string | null;
  description: string | null;
  eventFlyer: string | null;
  status: Event["status"];
  currency: string;
  platformFee: Event["platformFeeBearer"];
  paymentGatewayFee: Event["gatewayFeeBearer"];
  timings: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string | null;
    timezone: string;
  }>;
  ticketVariants: Array<{
    id: string;
    type: string;
    description: string | null;
    priceMinor: number;
    quantity: number;
    remaining: number;
  }>;
  promoCodes: Array<{
    id: string;
    code: string;
    discountType: PromoCode["discountType"];
    discountValue: number;
    minOrderMinor: number;
  }>;
  venue: {
    id: string;
    venueName: string;
    address: string | null;
    city: string | null;
    mapLink: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/** Split a timestamp into the date and HH:mm the UI works with. */
function splitTiming(timing: EventTiming) {
  const time = (value: Date) =>
    `${String(value.getUTCHours()).padStart(2, "0")}:${String(
      value.getUTCMinutes()
    ).padStart(2, "0")}`;

  return {
    id: timing.id,
    date: timing.startsAt.toISOString(),
    startTime: time(timing.startsAt),
    endTime: timing.endsAt ? time(timing.endsAt) : null,
    timezone: timing.timezone,
  };
}

function toEventWithDetails(
  event: Event,
  timings: EventTiming[],
  variants: TicketVariant[],
  promos: PromoCode[],
  venue: Venue | null
): EventWithDetails {
  return {
    id: event.id,
    eventName: event.eventName,
    slug: event.slug,
    description: event.description,
    eventFlyer: event.eventFlyer,
    status: event.status,
    currency: event.currency,
    platformFee: event.platformFeeBearer,
    paymentGatewayFee: event.gatewayFeeBearer,
    timings: timings.map(splitTiming),
    ticketVariants: variants.map((variant) => ({
      id: variant.id,
      type: variant.type,
      description: variant.description,
      priceMinor: variant.priceMinor,
      quantity: variant.quantityTotal,
      remaining: variant.quantityRemaining,
    })),
    promoCodes: promos.map((promo) => ({
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderMinor: promo.minOrderMinor,
    })),
    venue: venue
      ? {
          id: venue.id,
          venueName: venue.venueName,
          address: venue.address,
          city: venue.city,
          mapLink: venue.mapLink,
        }
      : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

/** Load one event with everything hanging off it, in a fixed number of queries. */
export async function findEventWithDetails(
  eventId: string
): Promise<EventWithDetails | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return null;

  const [timings, variants, promos, venue] = await Promise.all([
    db
      .select()
      .from(eventTimings)
      .where(eq(eventTimings.eventId, eventId))
      .orderBy(asc(eventTimings.startsAt)),
    db
      .select()
      .from(ticketVariants)
      .where(eq(ticketVariants.eventId, eventId))
      .orderBy(asc(ticketVariants.position)),
    db
      .select()
      .from(promoCodes)
      .where(and(eq(promoCodes.eventId, eventId), eq(promoCodes.active, true))),
    event.venueId
      ? db
          .select()
          .from(venues)
          .where(eq(venues.id, event.venueId))
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  return toEventWithDetails(event, timings, variants, promos, venue);
}

/** Same, but only if the event belongs to this organizer. */
export async function findOwnedEvent(
  eventId: string,
  userId: string
): Promise<EventWithDetails | null> {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)));
  if (!event) return null;
  return findEventWithDetails(eventId);
}

/**
 * All of an organizer's events, in one round trip per table rather than one
 * per event.
 *
 * Events whose last date has passed are marked completed as a side effect —
 * the previous implementation computed this on read and threw it away, so an
 * event displayed as "completed" was still `active` in the database.
 */
export async function listEventsForUser(
  userId: string
): Promise<EventWithDetails[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(sql`${events.createdAt} desc`);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [timings, variants, promos, venueRows] = await Promise.all([
    db
      .select()
      .from(eventTimings)
      .where(inArray(eventTimings.eventId, ids))
      .orderBy(asc(eventTimings.startsAt)),
    db
      .select()
      .from(ticketVariants)
      .where(inArray(ticketVariants.eventId, ids))
      .orderBy(asc(ticketVariants.position)),
    db.select().from(promoCodes).where(inArray(promoCodes.eventId, ids)),
    db.select().from(venues).where(eq(venues.userId, userId)),
  ]);

  const byEvent = <T extends { eventId: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      map.set(item.eventId, [...(map.get(item.eventId) ?? []), item]);
    }
    return map;
  };

  const timingsBy = byEvent(timings);
  const variantsBy = byEvent(variants);
  const promosBy = byEvent(promos);
  const venuesById = new Map(venueRows.map((venue) => [venue.id, venue]));

  await markPastEventsCompleted(ids);

  return rows.map((event) =>
    toEventWithDetails(
      event,
      timingsBy.get(event.id) ?? [],
      variantsBy.get(event.id) ?? [],
      promosBy.get(event.id) ?? [],
      event.venueId ? venuesById.get(event.venueId) ?? null : null
    )
  );
}

/** Flip active events whose final date is in the past to completed. */
async function markPastEventsCompleted(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await db
    .update(events)
    .set({ status: "completed", updatedAt: new Date() })
    .where(
      and(
        inArray(events.id, eventIds),
        eq(events.status, "active"),
        sql`not exists (
          select 1 from ${eventTimings}
          where ${eventTimings.eventId} = ${events.id}
            and coalesce(${eventTimings.endsAt}, ${eventTimings.startsAt}) >= now()
        )`,
        sql`exists (select 1 from ${eventTimings} where ${eventTimings.eventId} = ${events.id})`
      )
    );
}

export async function createDraftEvent(userId: string): Promise<Event> {
  const [event] = await db
    .insert(events)
    .values({ userId, status: "draft" })
    .returning();
  return event;
}

export async function deleteOwnedEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  const deleted = await db
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)))
    .returning({ id: events.id });
  return deleted.length > 0;
}

/** Public listing for an organization page, keyed by the organizer's slug. */
export async function listPublicEventsForOrg(slug: string) {
  const upcoming = await db
    .select({
      id: events.id,
      title: events.eventName,
      eventFlyer: events.eventFlyer,
      venueName: venues.venueName,
      startsAt: sql<Date | null>`min(${eventTimings.startsAt})`,
    })
    .from(events)
    .leftJoin(venues, eq(venues.id, events.venueId))
    .leftJoin(eventTimings, eq(eventTimings.eventId, events.id))
    .where(eq(events.status, "active"))
    .groupBy(events.id, venues.venueName)
    .orderBy(sql`min(${eventTimings.startsAt}) asc nulls last`);

  return { slug, events: upcoming };
}

export { lt };
