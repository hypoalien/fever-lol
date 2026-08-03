/**
 * Database schema.
 *
 * Two conventions run through all of this:
 *
 *   1. Money is stored as an integer number of minor units, never a float and
 *      never `numeric` read back as a string. Every amount column is suffixed
 *      `_minor` so there is no ambiguity at a call site about which unit it is
 *      in. See lib/money.ts.
 *
 *   2. Ticket inventory is a real column with a check constraint rather than a
 *      value recomputed from orders, so the database itself refuses to go
 *      negative. Overselling is prevented by the constraint, not by
 *      application care.
 */

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "active",
  "completed",
  "cancelled",
]);

/** Who absorbs a fee: added to the buyer's total, or taken off the payout. */
export const feeBearerEnum = pgEnum("fee_bearer", ["organizer", "user"]);

export const checkoutStatusEnum = pgEnum("checkout_status", [
  "pending",
  "paid",
  "expired",
  "abandoned",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "completed",
  "failed",
  "refunded",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "confirmed",
  "cancelled",
  "refunded",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "active",
  "checked_in",
  "cancelled",
  "refunded",
]);

export const discountTypeEnum = pgEnum("discount_type", ["flat", "percent"]);

export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "razorpay",
  "stripe",
]);

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Organizers. Ticket buyers are deliberately not users — they check out
 * anonymously and are identified by the email on their order.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    name: text("name"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    image: text("image"),

    orgName: text("org_name"),
    orgUrl: text("org_url"),
    /** ISO 4217. Null until the organizer completes onboarding. */
    currency: text("currency"),

    /** Set once onboarding is finished, so the redirect has something to read. */
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Case-insensitive: the previous store allowed Foo@x.com and foo@x.com to
    // become two accounts for the same person.
    uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`),
    uniqueIndex("users_org_url_lower_idx")
      .on(sql`lower(${table.orgUrl})`)
      .where(sql`${table.orgUrl} is not null`),
  ]
);

/* -------------------------------------------------------------------------- */
/* Venues                                                                     */
/* -------------------------------------------------------------------------- */

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    venueName: text("venue_name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    postalCode: text("postal_code"),
    mapLink: text("map_link"),
    capacity: integer("capacity"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("venues_user_id_idx").on(table.userId),
    check("venues_capacity_non_negative", sql`${table.capacity} >= 0`),
  ]
);

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),

    eventName: text("event_name"),
    /** URL segment for the public page. Unique per organizer. */
    slug: text("slug"),
    description: text("description"),
    eventFlyer: text("event_flyer"),
    status: eventStatusEnum("status").notNull().default("draft"),

    /** Priced in this currency; snapshotted from the organizer at publish. */
    currency: text("currency").notNull().default("USD"),

    platformFeeBearer: feeBearerEnum("platform_fee_bearer")
      .notNull()
      .default("user"),
    gatewayFeeBearer: feeBearerEnum("gateway_fee_bearer")
      .notNull()
      .default("user"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_user_id_idx").on(table.userId),
    index("events_status_idx").on(table.status),
    uniqueIndex("events_user_slug_idx")
      .on(table.userId, sql`lower(${table.slug})`)
      .where(sql`${table.slug} is not null`),
  ]
);

/** One event can run across several dates/times. */
export const eventTimings = pgTable(
  "event_timings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** IANA zone, so a listing can be rendered in the venue's local time. */
    timezone: text("timezone").notNull().default("UTC"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("event_timings_event_id_idx").on(table.eventId),
    check("event_timings_ends_after_starts", sql`
      ${table.endsAt} is null or ${table.endsAt} >= ${table.startsAt}
    `),
  ]
);

/**
 * A ticket type on sale.
 *
 * `quantityTotal` is what was released; `quantityRemaining` is the live count.
 * The check constraint is what actually prevents overselling — a concurrent
 * pair of checkouts both decrementing past zero fails at the database.
 */
export const ticketVariants = pgTable(
  "ticket_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    type: text("type").notNull(),
    description: text("description"),
    priceMinor: integer("price_minor").notNull(),

    quantityTotal: integer("quantity_total").notNull(),
    quantityRemaining: integer("quantity_remaining").notNull(),

    /** Display order in the ticket picker. */
    position: integer("position").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_variants_event_type_idx").on(table.eventId, table.type),
    check("ticket_variants_price_non_negative", sql`${table.priceMinor} >= 0`),
    check("ticket_variants_total_non_negative", sql`${table.quantityTotal} >= 0`),
    // The oversell guard.
    check(
      "ticket_variants_remaining_in_range",
      sql`${table.quantityRemaining} >= 0 and ${table.quantityRemaining} <= ${table.quantityTotal}`
    ),
  ]
);

export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    code: text("code").notNull(),
    discountType: discountTypeEnum("discount_type").notNull(),
    /** Minor units for `flat`, whole percent for `percent`. */
    discountValue: integer("discount_value").notNull(),
    minOrderMinor: integer("min_order_minor").notNull().default(0),

    /** Null means unlimited. */
    maxRedemptions: integer("max_redemptions"),
    timesRedeemed: integer("times_redeemed").notNull().default(0),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("promo_codes_event_code_idx").on(
      table.eventId,
      sql`lower(${table.code})`
    ),
    check("promo_codes_value_positive", sql`${table.discountValue} > 0`),
    check(
      "promo_codes_percent_within_bounds",
      sql`${table.discountType} <> 'percent' or ${table.discountValue} <= 100`
    ),
    check(
      "promo_codes_redemptions_within_max",
      sql`${table.maxRedemptions} is null or ${table.timesRedeemed} <= ${table.maxRedemptions}`
    ),
  ]
);

/* -------------------------------------------------------------------------- */
/* Payments configuration                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Per-organizer gateway credentials. Secrets stay encrypted at rest; only the
 * key id is kept in the clear so the dashboard can display it masked without
 * a decrypt round-trip.
 */
export const paymentConfigs = pgTable(
  "payment_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accountHolderName: text("account_holder_name"),
    gateway: paymentGatewayEnum("gateway").notNull(),

    razorpayKeyId: text("razorpay_key_id"),
    razorpayKeySecretEncrypted: text("razorpay_key_secret_encrypted"),
    stripePublishableKey: text("stripe_publishable_key"),
    stripeSecretKeyEncrypted: text("stripe_secret_key_encrypted"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("payment_configs_user_id_idx").on(table.userId)]
);

/* -------------------------------------------------------------------------- */
/* Checkout and orders                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A cart held while the buyer pays.
 *
 * Line prices are snapshotted at creation so an edit to the event mid-checkout
 * cannot change what the buyer agreed to.
 */
export const checkouts = pgTable(
  "checkouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promoCodeId: uuid("promo_code_id").references(() => promoCodes.id, {
      onDelete: "set null",
    }),

    currency: text("currency").notNull(),
    status: checkoutStatusEnum("status").notNull().default("pending"),

    /** Gateway order id, recorded so a payment signature can be tied back. */
    gatewayOrderId: text("gateway_order_id"),
    gatewayAmountMinor: integer("gateway_amount_minor"),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("checkouts_event_id_idx").on(table.eventId),
    index("checkouts_status_expires_idx").on(table.status, table.expiresAt),
    uniqueIndex("checkouts_gateway_order_id_idx")
      .on(table.gatewayOrderId)
      .where(sql`${table.gatewayOrderId} is not null`),
  ]
);

export const checkoutItems = pgTable(
  "checkout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => checkouts.id, { onDelete: "cascade" }),
    ticketVariantId: uuid("ticket_variant_id")
      .notNull()
      .references(() => ticketVariants.id, { onDelete: "restrict" }),

    /** Denormalised so an order still reads correctly if the variant is renamed. */
    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
  },
  (table) => [
    uniqueIndex("checkout_items_checkout_variant_idx").on(
      table.checkoutId,
      table.ticketVariantId
    ),
    check("checkout_items_quantity_positive", sql`${table.quantity} > 0`),
    check("checkout_items_price_non_negative", sql`${table.unitPriceMinor} >= 0`),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-facing reference shown to the buyer. */
    orderNumber: text("order_number").notNull(),

    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    checkoutId: uuid("checkout_id").references(() => checkouts.id, {
      onDelete: "set null",
    }),

    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone"),

    currency: text("currency").notNull(),
    subtotalMinor: integer("subtotal_minor").notNull(),
    discountMinor: integer("discount_minor").notNull().default(0),
    gatewayFeeMinor: integer("gateway_fee_minor").notNull().default(0),
    platformFeeMinor: integer("platform_fee_minor").notNull().default(0),
    totalMinor: integer("total_minor").notNull(),
    payoutMinor: integer("payout_minor").notNull(),

    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    orderStatus: orderStatusEnum("order_status").notNull().default("confirmed"),
    payoutStatus: payoutStatusEnum("payout_status").notNull().default("pending"),

    gateway: paymentGatewayEnum("gateway"),
    /** Gateway payment id. Unique — this is the idempotency key on confirm. */
    gatewayPaymentId: text("gateway_payment_id"),
    gatewayOrderId: text("gateway_order_id"),

    /** Event details as they stood at purchase, for the buyer's receipt. */
    eventSnapshot: jsonb("event_snapshot"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_order_number_idx").on(table.orderNumber),
    // Guarantees a retried confirmation cannot mint a second order.
    uniqueIndex("orders_gateway_payment_id_idx")
      .on(table.gatewayPaymentId)
      .where(sql`${table.gatewayPaymentId} is not null`),
    index("orders_organizer_id_idx").on(table.organizerId),
    index("orders_event_id_idx").on(table.eventId),
    index("orders_customer_email_idx").on(sql`lower(${table.customerEmail})`),
    index("orders_created_at_idx").on(table.createdAt),
    check("orders_totals_non_negative", sql`
      ${table.subtotalMinor} >= 0 and ${table.discountMinor} >= 0
      and ${table.totalMinor} >= 0 and ${table.payoutMinor} >= 0
    `),
    check(
      "orders_discount_within_subtotal",
      sql`${table.discountMinor} <= ${table.subtotalMinor}`
    ),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ticketVariantId: uuid("ticket_variant_id").references(
      () => ticketVariants.id,
      { onDelete: "set null" }
    ),

    type: text("type").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceMinor: integer("unit_price_minor").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ]
);

/** One row per admitted person — this is what gets scanned at the door. */
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ticketVariantId: uuid("ticket_variant_id").references(
      () => ticketVariants.id,
      { onDelete: "set null" }
    ),

    /** Unguessable; generated with a CSPRNG, not a timestamp. */
    code: text("code").notNull(),
    type: text("type").notNull(),
    pricePaidMinor: integer("price_paid_minor").notNull(),

    attendeeName: text("attendee_name"),
    attendeeEmail: text("attendee_email"),
    attendeePhone: text("attendee_phone"),

    status: ticketStatusEnum("status").notNull().default("active"),
    /** Set on first successful scan; a second scan must not overwrite it. */
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: uuid("checked_in_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tickets_code_idx").on(table.code),
    index("tickets_order_id_idx").on(table.orderId),
    index("tickets_event_id_idx").on(table.eventId),
    index("tickets_event_status_idx").on(table.eventId, table.status),
  ]
);

/**
 * Payments that were taken but could not be fulfilled — stock disappearing
 * mid-payment, an amount mismatch. Written so a human can refund rather than
 * the failure being swallowed by a log line.
 */
export const paymentIncidents = pgTable(
  "payment_incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkoutId: uuid("checkout_id").references(() => checkouts.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    gatewayPaymentId: text("gateway_payment_id"),
    gatewayOrderId: text("gateway_order_id"),
    amountMinor: integer("amount_minor"),
    currency: text("currency"),
    detail: text("detail"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_incidents_unresolved_idx")
      .on(table.createdAt)
      .where(sql`${table.resolvedAt} is null`),
  ]
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many, one }) => ({
  events: many(events),
  venues: many(venues),
  orders: many(orders),
  paymentConfig: one(paymentConfigs),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  user: one(users, { fields: [venues.userId], references: [users.id] }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, { fields: [events.userId], references: [users.id] }),
  venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
  timings: many(eventTimings),
  ticketVariants: many(ticketVariants),
  promoCodes: many(promoCodes),
  orders: many(orders),
  tickets: many(tickets),
}));

export const eventTimingsRelations = relations(eventTimings, ({ one }) => ({
  event: one(events, { fields: [eventTimings.eventId], references: [events.id] }),
}));

export const ticketVariantsRelations = relations(
  ticketVariants,
  ({ one, many }) => ({
    event: one(events, {
      fields: [ticketVariants.eventId],
      references: [events.id],
    }),
    tickets: many(tickets),
  })
);

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  event: one(events, { fields: [promoCodes.eventId], references: [events.id] }),
}));

export const paymentConfigsRelations = relations(paymentConfigs, ({ one }) => ({
  user: one(users, { fields: [paymentConfigs.userId], references: [users.id] }),
}));

export const checkoutsRelations = relations(checkouts, ({ one, many }) => ({
  event: one(events, { fields: [checkouts.eventId], references: [events.id] }),
  organizer: one(users, {
    fields: [checkouts.organizerId],
    references: [users.id],
  }),
  promoCode: one(promoCodes, {
    fields: [checkouts.promoCodeId],
    references: [promoCodes.id],
  }),
  items: many(checkoutItems),
}));

export const checkoutItemsRelations = relations(checkoutItems, ({ one }) => ({
  checkout: one(checkouts, {
    fields: [checkoutItems.checkoutId],
    references: [checkouts.id],
  }),
  ticketVariant: one(ticketVariants, {
    fields: [checkoutItems.ticketVariantId],
    references: [ticketVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  event: one(events, { fields: [orders.eventId], references: [events.id] }),
  organizer: one(users, {
    fields: [orders.organizerId],
    references: [users.id],
  }),
  checkout: one(checkouts, {
    fields: [orders.checkoutId],
    references: [checkouts.id],
  }),
  items: many(orderItems),
  tickets: many(tickets),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  ticketVariant: one(ticketVariants, {
    fields: [orderItems.ticketVariantId],
    references: [ticketVariants.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  order: one(orders, { fields: [tickets.orderId], references: [orders.id] }),
  event: one(events, { fields: [tickets.eventId], references: [events.id] }),
  ticketVariant: one(ticketVariants, {
    fields: [tickets.ticketVariantId],
    references: [ticketVariants.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventTiming = typeof eventTimings.$inferSelect;
export type NewEventTiming = typeof eventTimings.$inferInsert;
export type TicketVariant = typeof ticketVariants.$inferSelect;
export type NewTicketVariant = typeof ticketVariants.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
export type PaymentConfig = typeof paymentConfigs.$inferSelect;
export type NewPaymentConfig = typeof paymentConfigs.$inferInsert;
export type Checkout = typeof checkouts.$inferSelect;
export type NewCheckout = typeof checkouts.$inferInsert;
export type CheckoutItem = typeof checkoutItems.$inferSelect;
export type NewCheckoutItem = typeof checkoutItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type PaymentIncident = typeof paymentIncidents.$inferSelect;
export type NewPaymentIncident = typeof paymentIncidents.$inferInsert;
