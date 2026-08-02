/**
 * Seed the local database with something worth clicking through.
 *
 * Builds a store with sales in it, not just empty events: orders, tickets,
 * some already checked in. An empty dashboard tells you nothing about whether
 * the dashboard works.
 *
 * Idempotent: re-running replaces the seeded rows rather than duplicating them.
 * Refuses to run against anything that doesn't look local.
 *
 *   bun run db:seed
 *   SEED_EMAIL=you@example.com bun run db:seed   # seed onto your own account
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  eventTimings,
  events,
  orderItems,
  orders,
  promoCodes,
  ticketVariants,
  tickets,
  users,
  venues,
} from "@/lib/db/schema";
import { toMinor } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";
import crypto from "crypto";

/**
 * Whose account gets the data. Defaults to a throwaway organizer, but point it
 * at your own address to see the dashboard as yourself.
 */
const SEED_EMAIL = process.env.SEED_EMAIL ?? "organizer@fever.local";

/** A public page slug derived from the address, so two seeds cannot collide. */
function slugFor(email: string): string {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return local === "organizer" ? "lantern" : local.replace(/^-+|-+$/g, "");
}

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("@postgres:");
  if (!isLocal) {
    throw new Error(
      `Refusing to seed a non-local database. DATABASE_URL points at ${
        url.split("@")[1] ?? "an unknown host"
      }`
    );
  }
}

/** Days from now, at a fixed local hour, so seeded events are always upcoming. */
function daysFromNow(days: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function seed(): Promise<void> {
  assertLocalDatabase();

  const [existing] = await db
    .select({ id: users.id, orgUrl: users.orgUrl, currency: users.currency })
    .from(users)
    .where(eq(users.email, SEED_EMAIL));

  let organizer: { id: string };

  if (existing) {
    // A real account — yours, say. Clear only what a previous seed created and
    // leave the person alone, rather than deleting and recreating them.
    //
    // Orders first: the foreign key to events is RESTRICT on purpose, so that
    // financial history cannot vanish with an event. Tickets and order items
    // cascade from the order.
    await db.delete(orders).where(eq(orders.organizerId, existing.id));
    await db.delete(events).where(eq(events.userId, existing.id));
    await db.delete(venues).where(eq(venues.userId, existing.id));
    console.log(`reusing existing account ${SEED_EMAIL}, cleared its seed data`);

    // Onboarding fields are filled only where they are missing, so an already
    // configured profile is untouched.
    await db
      .update(users)
      .set({
        currency: existing.currency ?? "USD",
        orgUrl: existing.orgUrl ?? slugFor(SEED_EMAIL),
        onboardedAt: new Date(),
      })
      .where(eq(users.id, existing.id));

    organizer = existing;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        email: SEED_EMAIL,
        name: "Sam Rivera",
        firstName: "Sam",
        lastName: "Rivera",
        orgName: "Lantern Collective",
        orgUrl: slugFor(SEED_EMAIL),
        currency: "USD",
        emailVerified: true,
        onboardedAt: new Date(),
      })
      .returning();
    organizer = created;
  }

  const [venue] = await db
    .insert(venues)
    .values({
      userId: organizer.id,
      venueName: "The Warehouse",
      address: "412 Foundry Street",
      city: "Austin",
      state: "TX",
      country: "USA",
      postalCode: "78702",
      mapLink: "https://maps.google.com/?q=412+Foundry+Street+Austin",
      capacity: 400,
    })
    .returning();

  const [secondVenue] = await db
    .insert(venues)
    .values({
      userId: organizer.id,
      venueName: "Rooftop at Fifth",
      address: "500 Fifth Avenue",
      city: "Austin",
      state: "TX",
      country: "USA",
      capacity: 120,
    })
    .returning();

  /** An event on sale, one still a draft, and one already finished. */
  const seedEvents = [
    {
      eventName: "Midnight Frequencies",
      slug: "midnight-frequencies",
      description:
        "An all-night showcase of experimental electronic music across two rooms.",
      status: "active" as const,
      venueId: venue.id,
      publishedAt: new Date(),
      timings: [{ start: daysFromNow(21, 21), end: daysFromNow(22, 3) }],
      variants: [
        { type: "Early Bird", price: "25", total: 100, remaining: 12 },
        { type: "General Admission", price: "40", total: 250, remaining: 187 },
        { type: "VIP", price: "95.50", total: 50, remaining: 8 },
      ],
      promos: [
        { code: "LANTERN10", type: "percent" as const, value: 10, min: "0" },
        { code: "FIRSTSHOW", type: "flat" as const, value: "5", min: "30" },
      ],
    },
    {
      eventName: "Sunset Sessions",
      slug: "sunset-sessions",
      description: "Acoustic sets on the rooftop as the sun goes down.",
      status: "active" as const,
      venueId: secondVenue.id,
      publishedAt: new Date(),
      timings: [
        { start: daysFromNow(7, 18), end: daysFromNow(7, 22) },
        { start: daysFromNow(14, 18), end: daysFromNow(14, 22) },
      ],
      variants: [
        { type: "General Admission", price: "18", total: 120, remaining: 120 },
        // Deliberately sold out, so the UI's empty state is exercised.
        { type: "Front Row", price: "45", total: 20, remaining: 0 },
      ],
      promos: [],
    },
    {
      eventName: "Winter Warehouse (draft)",
      slug: null,
      description: "Not published yet.",
      status: "draft" as const,
      venueId: venue.id,
      publishedAt: null,
      timings: [],
      variants: [],
      promos: [],
    },
  ];

  for (const spec of seedEvents) {
    const [event] = await db
      .insert(events)
      .values({
        userId: organizer.id,
        venueId: spec.venueId,
        eventName: spec.eventName,
        slug: spec.slug,
        description: spec.description,
        status: spec.status,
        currency: "USD",
        publishedAt: spec.publishedAt,
        eventFlyer: `https://picsum.photos/seed/${encodeURIComponent(
          spec.eventName
        )}/1200/630`,
      })
      .returning();

    for (const timing of spec.timings) {
      await db.insert(eventTimings).values({
        eventId: event.id,
        startsAt: timing.start,
        endsAt: timing.end,
        timezone: "America/Chicago",
      });
    }

    for (const [index, variant] of spec.variants.entries()) {
      await db.insert(ticketVariants).values({
        eventId: event.id,
        type: variant.type,
        priceMinor: toMinor(variant.price, "USD"),
        quantityTotal: variant.total,
        quantityRemaining: variant.remaining,
        position: index,
      });
    }

    for (const promo of spec.promos) {
      await db.insert(promoCodes).values({
        eventId: event.id,
        code: promo.code,
        discountType: promo.type,
        // `flat` is money and needs converting; `percent` is a plain number.
        discountValue:
          promo.type === "flat"
            ? toMinor(promo.value, "USD")
            : Number(promo.value),
        minOrderMinor: toMinor(promo.min, "USD"),
      });
    }

    console.log(
      `seeded "${event.eventName}" (${spec.status}) with ${spec.variants.length} ticket type(s)`
    );

    if (spec.status === "active") {
      const sold = await seedOrders(organizer.id, event.id, "USD");
      console.log(`  ${sold} order(s) with tickets`);
    }
  }

  console.log(`\norganizer: ${SEED_EMAIL}`);
  console.log("done");
}

const BUYERS = [
  ["Priya Raman", "priya.raman@example.com", "+1 512 555 0142"],
  ["Marcus Webb", "m.webb@example.com", "+1 512 555 0177"],
  ["Yuki Tanaka", "yuki.tanaka@example.com", "+81 90 5555 0123"],
  ["Ana Ferreira", "ana.f@example.com", "+55 11 95555 0198"],
  ["Tom Okafor", "tom.okafor@example.com", "+1 737 555 0110"],
  ["Lena Fischer", "lena.fischer@example.com", "+49 151 5555 0165"],
] as const;

function reference(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(5).toString("base64url").toUpperCase()}`;
}

/**
 * Buy tickets against an event, decrementing its stock the way a real
 * checkout would, so remaining counts stay consistent with what was sold.
 */
async function seedOrders(
  organizerId: string,
  eventId: string,
  currency: string
): Promise<number> {
  const variants = await db
    .select()
    .from(ticketVariants)
    .where(eq(ticketVariants.eventId, eventId));
  if (variants.length === 0) return 0;

  let created = 0;

  for (const [index, buyer] of BUYERS.entries()) {
    const [name, email, phone] = buyer;
    const variant = variants[index % variants.length];
    const quantity = (index % 3) + 1;
    if (variant.quantityRemaining < quantity) continue;

    const line = {
      type: variant.type,
      quantity,
      unitPriceMinor: variant.priceMinor,
      lineTotalMinor: variant.priceMinor * quantity,
    };
    const totals = computeTotals([line], { currency });

    // Spread the orders back over the last three weeks so the revenue chart
    // and "sales today" figures have something to differ about.
    const placedAt = new Date();
    placedAt.setDate(placedAt.getDate() - index * 3);

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber: reference("ORD"),
        eventId,
        organizerId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        currency,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        gatewayFeeMinor: totals.gatewayFeeMinor,
        platformFeeMinor: totals.platformFeeMinor,
        totalMinor: totals.totalMinor,
        payoutMinor: totals.payoutMinor,
        paymentStatus: "completed",
        orderStatus: "confirmed",
        gateway: "razorpay",
        gatewayPaymentId: reference("pay"),
        gatewayOrderId: reference("order"),
        createdAt: placedAt,
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      ticketVariantId: variant.id,
      type: line.type,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
    });

    await db.insert(tickets).values(
      Array.from({ length: quantity }, (_, seat) => ({
        orderId: order.id,
        eventId,
        ticketVariantId: variant.id,
        code: `TKT-${crypto.randomBytes(12).toString("base64url")}`,
        type: variant.type,
        pricePaidMinor: variant.priceMinor,
        attendeeName: name,
        attendeeEmail: email,
        attendeePhone: phone,
        // A couple already through the door, so the attendee table shows both
        // states rather than one.
        ...(index < 2 && seat === 0
          ? { status: "checked_in" as const, checkedInAt: new Date() }
          : {}),
        createdAt: placedAt,
      }))
    );

    await db
      .update(ticketVariants)
      .set({ quantityRemaining: variant.quantityRemaining - quantity })
      .where(eq(ticketVariants.id, variant.id));
    variant.quantityRemaining -= quantity;

    created += 1;
  }

  return created;
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
