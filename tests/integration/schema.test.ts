/**
 * Integration tests against a real Postgres.
 *
 * These assert that the *database* rejects bad data, not that the application
 * remembers to check. That distinction matters for inventory: an application
 * guard can be raced, a check constraint cannot.
 *
 * Requires `docker compose up -d postgres`.
 */

import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import {
  events,
  orders,
  promoCodes,
  ticketVariants,
  users,
} from "@/lib/db/schema";

async function truncateAll(): Promise<void> {
  await db.execute(
    sql`truncate table users, events, ticket_variants, orders, promo_codes, venues, checkouts, tickets cascade`
  );
}

/**
 * postgres.js reports the violated constraint on the error object, and Drizzle
 * wraps that in `cause`. Reading the field is a sharper assertion than matching
 * a substring of the message — it names exactly which rule rejected the write.
 */
function violatedConstraint(error: unknown): string | undefined {
  for (let current = error; current != null; current = (current as { cause?: unknown }).cause) {
    if (typeof current !== "object") continue;
    const name = (current as { constraint_name?: unknown }).constraint_name;
    if (typeof name === "string") return name;
  }
  return undefined;
}

/** Assert that an operation is rejected by a specific database constraint. */
async function expectRejectedBy(
  operation: Promise<unknown>,
  constraint: string
): Promise<void> {
  try {
    await operation;
  } catch (error) {
    expect(violatedConstraint(error)).toBe(constraint);
    return;
  }
  throw new Error(
    `expected the database to reject this via "${constraint}", but it succeeded`
  );
}

async function seedEventWithStock(quantity: number) {
  const [user] = await db
    .insert(users)
    .values({ email: `organizer-${crypto.randomUUID()}@example.com` })
    .returning();

  const [event] = await db
    .insert(events)
    .values({
      userId: user.id,
      eventName: "Integration Test Event",
      status: "active",
      currency: "USD",
    })
    .returning();

  const [variant] = await db
    .insert(ticketVariants)
    .values({
      eventId: event.id,
      type: "General Admission",
      priceMinor: 2000,
      quantityTotal: quantity,
      quantityRemaining: quantity,
    })
    .returning();

  return { user, event, variant };
}

beforeEach(truncateAll);
afterAll(truncateAll);

describe("ticket inventory", () => {
  it("allows selling exactly the available stock", async () => {
    const { variant } = await seedEventWithStock(2);

    await db
      .update(ticketVariants)
      .set({ quantityRemaining: sql`${ticketVariants.quantityRemaining} - 2` })
      .where(sql`${ticketVariants.id} = ${variant.id}`);

    const [after] = await db
      .select()
      .from(ticketVariants)
      .where(sql`${ticketVariants.id} = ${variant.id}`);
    expect(after.quantityRemaining).toBe(0);
  });

  it("refuses to go negative, so the last ticket cannot be sold twice", async () => {
    const { variant } = await seedEventWithStock(1);

    await expectRejectedBy(
      db
        .update(ticketVariants)
        .set({
          quantityRemaining: sql`${ticketVariants.quantityRemaining} - 2`,
        })
        .where(sql`${ticketVariants.id} = ${variant.id}`),
      "ticket_variants_remaining_in_range"
    );
  });

  it("survives concurrent buyers racing for the last ticket", async () => {
    const { variant } = await seedEventWithStock(1);

    // Both decrements are issued without waiting for the other. Exactly one
    // may win; the loser must be rejected by the constraint.
    const attempts = [0, 1].map(() =>
      db
        .update(ticketVariants)
        .set({
          quantityRemaining: sql`${ticketVariants.quantityRemaining} - 1`,
        })
        .where(sql`${ticketVariants.id} = ${variant.id}`)
        .then(
          () => "ok" as const,
          () => "rejected" as const
        )
    );

    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "rejected")).toHaveLength(1);

    const [after] = await db
      .select()
      .from(ticketVariants)
      .where(sql`${ticketVariants.id} = ${variant.id}`);
    expect(after.quantityRemaining).toBe(0);
  });

  it("refuses stock above the total ever released", async () => {
    const { variant } = await seedEventWithStock(5);

    await expectRejectedBy(
      db
        .update(ticketVariants)
        .set({ quantityRemaining: 6 })
        .where(sql`${ticketVariants.id} = ${variant.id}`),
      "ticket_variants_remaining_in_range"
    );
  });
});

describe("user identity", () => {
  it("treats addresses differing only in case as the same account", async () => {
    await db.insert(users).values({ email: "Organizer@Example.com" });

    await expectRejectedBy(
      db.insert(users).values({ email: "organizer@example.com" }),
      "users_email_lower_idx"
    );
  });
});

describe("order idempotency", () => {
  it("rejects a second order for the same gateway payment", async () => {
    const { user, event } = await seedEventWithStock(10);

    const base = {
      eventId: event.id,
      organizerId: user.id,
      customerName: "Buyer",
      customerEmail: "buyer@example.com",
      currency: "USD",
      subtotalMinor: 2000,
      totalMinor: 2060,
      payoutMinor: 2000,
      gatewayPaymentId: "pay_DUPLICATE",
    };

    await db.insert(orders).values({ ...base, orderNumber: "ORD-A" });

    await expectRejectedBy(
      db.insert(orders).values({ ...base, orderNumber: "ORD-B" }),
      "orders_gateway_payment_id_idx"
    );
  });

  it("still allows unpaid orders that have no gateway payment yet", async () => {
    const { user, event } = await seedEventWithStock(10);

    const base = {
      eventId: event.id,
      organizerId: user.id,
      customerName: "Buyer",
      customerEmail: "buyer@example.com",
      currency: "USD",
      subtotalMinor: 0,
      totalMinor: 0,
      payoutMinor: 0,
    };

    // The unique index is partial, so multiple nulls must not collide.
    await db.insert(orders).values({ ...base, orderNumber: "ORD-C" });
    await db.insert(orders).values({ ...base, orderNumber: "ORD-D" });

    const rows = await db.select().from(orders);
    expect(rows).toHaveLength(2);
  });
});

describe("money invariants", () => {
  it("rejects a discount larger than the subtotal", async () => {
    const { user, event } = await seedEventWithStock(10);

    await expectRejectedBy(
      db.insert(orders).values({
        orderNumber: "ORD-NEG",
        eventId: event.id,
        organizerId: user.id,
        customerName: "Buyer",
        customerEmail: "buyer@example.com",
        currency: "USD",
        subtotalMinor: 1000,
        discountMinor: 5000,
        totalMinor: 0,
        payoutMinor: 0,
      }),
      "orders_discount_within_subtotal"
    );
  });

  it("rejects a percentage promo above 100", async () => {
    const { event } = await seedEventWithStock(10);

    await expectRejectedBy(
      db.insert(promoCodes).values({
        eventId: event.id,
        code: "TOOMUCH",
        discountType: "percent",
        discountValue: 150,
      }),
      "promo_codes_percent_within_bounds"
    );
  });

  it("allows a flat promo larger than 100, which is a valid amount", async () => {
    const { event } = await seedEventWithStock(10);

    const [promo] = await db
      .insert(promoCodes)
      .values({
        eventId: event.id,
        code: "FLAT500",
        discountType: "flat",
        discountValue: 50_000,
      })
      .returning();

    expect(promo.discountValue).toBe(50_000);
  });

  it("rejects a negative ticket price", async () => {
    const { event } = await seedEventWithStock(10);

    await expectRejectedBy(
      db.insert(ticketVariants).values({
        eventId: event.id,
        type: "Negative",
        priceMinor: -1,
        quantityTotal: 1,
        quantityRemaining: 1,
      }),
      "ticket_variants_price_non_negative"
    );
  });
});

describe("event integrity", () => {
  it("rejects two ticket types with the same name on one event", async () => {
    const { event } = await seedEventWithStock(10);

    await expectRejectedBy(
      db.insert(ticketVariants).values({
        eventId: event.id,
        type: "General Admission",
        priceMinor: 500,
        quantityTotal: 1,
        quantityRemaining: 1,
      }),
      "ticket_variants_event_type_idx"
    );
  });

  it("removes an event's ticket variants when the event is deleted", async () => {
    const { event } = await seedEventWithStock(10);

    await db.delete(events).where(sql`${events.id} = ${event.id}`);

    const remaining = await db.select().from(ticketVariants);
    expect(remaining).toHaveLength(0);
  });

  it("refuses to delete an event that has orders against it", async () => {
    const { user, event } = await seedEventWithStock(10);
    await db.insert(orders).values({
      orderNumber: "ORD-KEEP",
      eventId: event.id,
      organizerId: user.id,
      customerName: "Buyer",
      customerEmail: "buyer@example.com",
      currency: "USD",
      subtotalMinor: 2000,
      totalMinor: 2000,
      payoutMinor: 2000,
    });

    // Financial history must not disappear with the event.
    await expectRejectedBy(
      db.delete(events).where(sql`${events.id} = ${event.id}`),
      "orders_event_id_events_id_fk"
    );
  });
});
