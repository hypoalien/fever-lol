import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  eventTimings,
  events,
  promoCodes,
  ticketVariants,
} from "@/lib/db/schema";
import { toMinor } from "@/lib/money";

/**
 * Saving an event.
 *
 * The previous handler did `$set: { ...eventData }` with whatever the browser
 * posted, so an organizer could set any field on their own event — including
 * `status`, bypassing publish validation, and `ticketsSold`/`revenue`. Only
 * the fields below are writable now, and they are validated first.
 */

const TimingInput = z.object({
  date: z.union([z.string(), z.date()]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:mm").optional(),
  timezone: z.string().optional(),
});

const TicketVariantInput = z.object({
  type: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  price: z.union([z.string(), z.number()]),
  quantity: z.union([z.string(), z.number()]),
  remaining: z.union([z.string(), z.number()]).optional(),
});

const PromoCodeInput = z.object({
  code: z.string().trim().min(1).max(64),
  discountType: z.enum(["flat", "percent"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().nonnegative().optional(),
});

export const EventUpdateSchema = z.object({
  eventName: z.string().trim().min(1).max(200).optional(),
  // The form calls it eventDescription; the column is `description`.
  eventDescription: z.string().trim().max(5000).optional(),
  eventFlyer: z.string().trim().max(2000).optional(),
  slug: z.string().trim().max(200).nullable().optional(),
  timings: z.array(TimingInput).optional(),
  ticketVariants: z.array(TicketVariantInput).optional(),
  promoCodes: z.array(PromoCodeInput).optional(),
  platformFee: z.enum(["organizer", "user"]).optional(),
  paymentGatewayFee: z.enum(["organizer", "user"]).optional(),
  venue: z.object({ id: z.string().uuid() }).nullable().optional(),
  // Accepted, but only the two transitions below are honoured.
  status: z.enum(["draft", "active", "cancelled"]).optional(),
});

export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;

export class EventWriteError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "EventWriteError";
    this.status = status;
  }
}

/** Combine a calendar date with an HH:mm into a single instant. */
function combine(date: string | Date, time: string): Date {
  const base = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(base.getTime())) {
    throw new EventWriteError(`Invalid date: ${String(date)}`);
  }
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(base);
  combined.setUTCHours(hours, minutes, 0, 0);
  return combined;
}

function toInteger(value: string | number, label: string): number {
  const parsed = typeof value === "string" ? Number(value.trim()) : value;
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new EventWriteError(`Invalid ${label}: ${String(value)}`);
  }
  return Math.floor(parsed);
}

/**
 * Publishing requires an event to actually be sellable. The previous code let
 * a `status: "active"` land with no name, no dates and no tickets.
 */
function assertPublishable(input: EventUpdateInput, currency: string): void {
  const problems: string[] = [];
  if (!input.eventName?.trim()) problems.push("a name");
  if (!input.timings?.length) problems.push("at least one date");
  if (!input.ticketVariants?.length) problems.push("at least one ticket type");
  if (!input.venue?.id) problems.push("a venue");

  for (const variant of input.ticketVariants ?? []) {
    try {
      toMinor(variant.price, currency);
    } catch {
      problems.push(`a valid price for "${variant.type}"`);
    }
  }

  if (problems.length > 0) {
    throw new EventWriteError(
      `This event needs ${problems.join(", ")} before it can be published`
    );
  }
}

/**
 * Apply an update to an event the caller owns.
 *
 * Child collections are replaced wholesale inside a transaction, but ticket
 * variants are matched on `type` so that an edit preserves the identity — and
 * therefore the remaining stock — of tickets already on sale.
 */
export async function updateOwnedEvent(
  eventId: string,
  userId: string,
  input: EventUpdateInput
): Promise<void> {
  const [existing] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.userId, userId)));

  if (!existing) {
    throw new EventWriteError("Event not found", 404);
  }

  const currency = existing.currency;
  const publishing = input.status === "active" && existing.status !== "active";
  if (publishing) assertPublishable(input, currency);

  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({
        ...(input.eventName !== undefined && { eventName: input.eventName }),
        ...(input.eventDescription !== undefined && {
          description: input.eventDescription,
        }),
        ...(input.eventFlyer !== undefined && { eventFlyer: input.eventFlyer }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.platformFee !== undefined && {
          platformFeeBearer: input.platformFee,
        }),
        ...(input.paymentGatewayFee !== undefined && {
          gatewayFeeBearer: input.paymentGatewayFee,
        }),
        ...(input.venue !== undefined && {
          venueId: input.venue?.id ?? null,
        }),
        // Only publish and cancel are honoured; nothing else may set status.
        ...(publishing && { status: "active" as const, publishedAt: new Date() }),
        ...(input.status === "cancelled" && { status: "cancelled" as const }),
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    if (input.timings) {
      await tx.delete(eventTimings).where(eq(eventTimings.eventId, eventId));
      if (input.timings.length > 0) {
        await tx.insert(eventTimings).values(
          input.timings.map((timing) => ({
            eventId,
            startsAt: combine(timing.date, timing.startTime),
            endsAt: timing.endTime
              ? combine(timing.date, timing.endTime)
              : null,
            timezone: timing.timezone ?? "UTC",
          }))
        );
      }
    }

    if (input.ticketVariants) {
      const current = await tx
        .select()
        .from(ticketVariants)
        .where(eq(ticketVariants.eventId, eventId));
      const currentByType = new Map(current.map((row) => [row.type, row]));

      const keptIds: string[] = [];
      for (const [index, variant] of input.ticketVariants.entries()) {
        const priceMinor = toMinor(variant.price, currency);
        const total = toInteger(variant.quantity, "ticket quantity");
        const previous = currentByType.get(variant.type);

        if (previous) {
          // Preserve tickets already sold: shift remaining by the change in
          // total rather than resetting it, and never let it go negative.
          const sold = previous.quantityTotal - previous.quantityRemaining;
          const remaining = Math.max(0, Math.min(total, total - sold));
          const [updated] = await tx
            .update(ticketVariants)
            .set({
              description: variant.description ?? null,
              priceMinor,
              quantityTotal: total,
              quantityRemaining: remaining,
              position: index,
              updatedAt: new Date(),
            })
            .where(eq(ticketVariants.id, previous.id))
            .returning({ id: ticketVariants.id });
          keptIds.push(updated.id);
        } else {
          const [inserted] = await tx
            .insert(ticketVariants)
            .values({
              eventId,
              type: variant.type,
              description: variant.description ?? null,
              priceMinor,
              quantityTotal: total,
              quantityRemaining: total,
              position: index,
            })
            .returning({ id: ticketVariants.id });
          keptIds.push(inserted.id);
        }
      }

      const removed = current
        .filter((row) => !keptIds.includes(row.id))
        .map((row) => row.id);
      if (removed.length > 0) {
        await tx
          .delete(ticketVariants)
          .where(inArray(ticketVariants.id, removed));
      }
    }

    if (input.promoCodes) {
      await tx.delete(promoCodes).where(eq(promoCodes.eventId, eventId));
      if (input.promoCodes.length > 0) {
        await tx.insert(promoCodes).values(
          input.promoCodes.map((promo) => ({
            eventId,
            code: promo.code,
            discountType: promo.discountType,
            discountValue:
              promo.discountType === "flat"
                ? toMinor(promo.discountValue, currency)
                : promo.discountValue,
            minOrderMinor: toMinor(promo.minOrderValue ?? 0, currency),
          }))
        );
      }
    }
  });
}
