import { z } from "zod";

/**
 * The attendee row as the API returns it.
 *
 * Mirrors `listAttendees` in lib/data/tickets.ts. Keeping this in step with
 * the query is the point: when the two drifted, the table silently rendered
 * empty columns because the parse threw and the catch swallowed it.
 */
export const AttendeeSchema = z.object({
  /** Ticket id. One row per admitted person. */
  id: z.string(),
  /** Unguessable ticket code; what the QR encodes. */
  code: z.string(),
  type: z.string(),
  status: z.enum(["active", "checked_in", "cancelled", "refunded"]),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  checkedInAt: z.string().nullable(),
  eventId: z.string(),
  eventName: z.string().nullable(),
  orderNumber: z.string(),
  purchasedAt: z.string(),
});

export type Attendee = z.infer<typeof AttendeeSchema>;

export const AttendeesResponseSchema = z.object({
  attendees: z.array(AttendeeSchema),
});
