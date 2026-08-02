import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { venues, type Venue } from "@/lib/db/schema";

export const VenueInputSchema = z.object({
  venueName: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(32).optional(),
  mapLink: z.string().trim().max(2000).optional(),
  capacity: z.number().int().nonnegative().optional(),
});

export type VenueInput = z.infer<typeof VenueInputSchema>;

/** The shape the client consumes. Database rows are not returned directly. */
export interface VenueView {
  id: string;
  venueName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  mapLink: string | null;
  capacity: number | null;
}

export function toVenueView(venue: Venue): VenueView {
  return {
    id: venue.id,
    venueName: venue.venueName,
    address: venue.address,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    postalCode: venue.postalCode,
    mapLink: venue.mapLink,
    capacity: venue.capacity,
  };
}

export async function listVenues(userId: string): Promise<VenueView[]> {
  const rows = await db
    .select()
    .from(venues)
    .where(eq(venues.userId, userId))
    .orderBy(asc(venues.venueName));
  return rows.map(toVenueView);
}

export async function createVenue(
  userId: string,
  input: VenueInput
): Promise<VenueView> {
  const [venue] = await db
    .insert(venues)
    .values({ ...input, userId })
    .returning();
  return toVenueView(venue);
}

export async function updateOwnedVenue(
  venueId: string,
  userId: string,
  input: VenueInput
): Promise<VenueView | null> {
  const [venue] = await db
    .update(venues)
    .set({ ...input, updatedAt: new Date() })
    // Ownership is part of the WHERE clause, so a mismatched user simply
    // updates nothing rather than needing a separate lookup first.
    .where(and(eq(venues.id, venueId), eq(venues.userId, userId)))
    .returning();
  return venue ? toVenueView(venue) : null;
}

export async function deleteOwnedVenue(
  venueId: string,
  userId: string
): Promise<boolean> {
  const deleted = await db
    .delete(venues)
    .where(and(eq(venues.id, venueId), eq(venues.userId, userId)))
    .returning({ id: venues.id });
  return deleted.length > 0;
}
