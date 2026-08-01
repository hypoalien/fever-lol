/**
 * Seed the local database with something worth clicking through.
 *
 * Idempotent: re-running replaces the seeded rows rather than duplicating them.
 * Refuses to run against anything that doesn't look local, so it can't be
 * pointed at production by accident.
 *
 *   bun run db:seed
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  eventTimings,
  events,
  promoCodes,
  ticketVariants,
  users,
  venues,
} from "@/lib/db/schema";
import { toMinor } from "@/lib/money";

const SEED_EMAIL = "organizer@fever.local";

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

  // Clearing by organizer keeps any other local data intact.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, SEED_EMAIL));
  if (existing) {
    await db.delete(users).where(eq(users.id, existing.id));
    console.log("removed previous seed data");
  }

  const [organizer] = await db
    .insert(users)
    .values({
      email: SEED_EMAIL,
      name: "Sam Rivera",
      firstName: "Sam",
      lastName: "Rivera",
      orgName: "Lantern Collective",
      orgUrl: "lantern",
      currency: "USD",
      emailVerified: new Date(),
      onboardedAt: new Date(),
    })
    .returning();

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
  }

  console.log(`\norganizer: ${SEED_EMAIL}`);
  console.log("done");
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
