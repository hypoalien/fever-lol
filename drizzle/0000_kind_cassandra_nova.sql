CREATE TYPE "public"."checkout_status" AS ENUM('pending', 'paid', 'expired', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('flat', 'percent');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fee_bearer" AS ENUM('organizer', 'user');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('confirmed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway" AS ENUM('razorpay', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('active', 'checked_in', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TABLE "checkout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_id" uuid NOT NULL,
	"ticket_variant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	CONSTRAINT "checkout_items_quantity_positive" CHECK ("checkout_items"."quantity" > 0),
	CONSTRAINT "checkout_items_price_non_negative" CHECK ("checkout_items"."unit_price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"organizer_id" uuid NOT NULL,
	"promo_code_id" uuid,
	"currency" text NOT NULL,
	"status" "checkout_status" DEFAULT 'pending' NOT NULL,
	"gateway_order_id" text,
	"gateway_amount_minor" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_timings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_timings_ends_after_starts" CHECK (
      "event_timings"."ends_at" is null or "event_timings"."ends_at" >= "event_timings"."starts_at"
    )
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"event_name" text,
	"slug" text,
	"description" text,
	"event_flyer" text,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"platform_fee_bearer" "fee_bearer" DEFAULT 'user' NOT NULL,
	"gateway_fee_bearer" "fee_bearer" DEFAULT 'user' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"ticket_variant_id" uuid,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"event_id" uuid NOT NULL,
	"organizer_id" uuid NOT NULL,
	"checkout_id" uuid,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"currency" text NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"gateway_fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"payout_minor" integer NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"order_status" "order_status" DEFAULT 'confirmed' NOT NULL,
	"payout_status" "payout_status" DEFAULT 'pending' NOT NULL,
	"gateway" "payment_gateway",
	"gateway_payment_id" text,
	"gateway_order_id" text,
	"event_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_totals_non_negative" CHECK (
      "orders"."subtotal_minor" >= 0 and "orders"."discount_minor" >= 0
      and "orders"."total_minor" >= 0 and "orders"."payout_minor" >= 0
    ),
	CONSTRAINT "orders_discount_within_subtotal" CHECK ("orders"."discount_minor" <= "orders"."subtotal_minor")
);
--> statement-breakpoint
CREATE TABLE "payment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_holder_name" text,
	"gateway" "payment_gateway" NOT NULL,
	"razorpay_key_id" text,
	"razorpay_key_secret_encrypted" text,
	"stripe_publishable_key" text,
	"stripe_secret_key_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_id" uuid,
	"kind" text NOT NULL,
	"gateway_payment_id" text,
	"gateway_order_id" text,
	"amount_minor" integer,
	"currency" text,
	"detail" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"code" text NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"min_order_minor" integer DEFAULT 0 NOT NULL,
	"max_redemptions" integer,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_value_positive" CHECK ("promo_codes"."discount_value" > 0),
	CONSTRAINT "promo_codes_percent_within_bounds" CHECK ("promo_codes"."discount_type" <> 'percent' or "promo_codes"."discount_value" <= 100),
	CONSTRAINT "promo_codes_redemptions_within_max" CHECK ("promo_codes"."max_redemptions" is null or "promo_codes"."times_redeemed" <= "promo_codes"."max_redemptions")
);
--> statement-breakpoint
CREATE TABLE "ticket_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"price_minor" integer NOT NULL,
	"quantity_total" integer NOT NULL,
	"quantity_remaining" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_variants_price_non_negative" CHECK ("ticket_variants"."price_minor" >= 0),
	CONSTRAINT "ticket_variants_total_non_negative" CHECK ("ticket_variants"."quantity_total" >= 0),
	CONSTRAINT "ticket_variants_remaining_in_range" CHECK ("ticket_variants"."quantity_remaining" >= 0 and "ticket_variants"."quantity_remaining" <= "ticket_variants"."quantity_total")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"ticket_variant_id" uuid,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"price_paid_minor" integer NOT NULL,
	"attendee_name" text,
	"attendee_email" text,
	"attendee_phone" text,
	"status" "ticket_status" DEFAULT 'active' NOT NULL,
	"checked_in_at" timestamp with time zone,
	"checked_in_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"name" text,
	"first_name" text,
	"last_name" text,
	"image" text,
	"org_name" text,
	"org_url" text,
	"currency" text,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"map_link" text,
	"capacity" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_capacity_non_negative" CHECK ("venues"."capacity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_ticket_variant_id_ticket_variants_id_fk" FOREIGN KEY ("ticket_variant_id") REFERENCES "public"."ticket_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_timings" ADD CONSTRAINT "event_timings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_variant_id_ticket_variants_id_fk" FOREIGN KEY ("ticket_variant_id") REFERENCES "public"."ticket_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_configs" ADD CONSTRAINT "payment_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_incidents" ADD CONSTRAINT "payment_incidents_checkout_id_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_variants" ADD CONSTRAINT "ticket_variants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_ticket_variant_id_ticket_variants_id_fk" FOREIGN KEY ("ticket_variant_id") REFERENCES "public"."ticket_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_checked_in_by_users_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_items_checkout_variant_idx" ON "checkout_items" USING btree ("checkout_id","ticket_variant_id");--> statement-breakpoint
CREATE INDEX "checkouts_event_id_idx" ON "checkouts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "checkouts_status_expires_idx" ON "checkouts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "checkouts_gateway_order_id_idx" ON "checkouts" USING btree ("gateway_order_id") WHERE "checkouts"."gateway_order_id" is not null;--> statement-breakpoint
CREATE INDEX "event_timings_event_id_idx" ON "event_timings" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_user_id_idx" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "events_user_slug_idx" ON "events" USING btree ("user_id",lower("slug")) WHERE "events"."slug" is not null;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_gateway_payment_id_idx" ON "orders" USING btree ("gateway_payment_id") WHERE "orders"."gateway_payment_id" is not null;--> statement-breakpoint
CREATE INDEX "orders_organizer_id_idx" ON "orders" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "orders_event_id_idx" ON "orders" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree (lower("customer_email"));--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_configs_user_id_idx" ON "payment_configs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_incidents_unresolved_idx" ON "payment_incidents" USING btree ("created_at") WHERE "payment_incidents"."resolved_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "promo_codes_event_code_idx" ON "promo_codes" USING btree ("event_id",lower("code"));--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_variants_event_type_idx" ON "ticket_variants" USING btree ("event_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_code_idx" ON "tickets" USING btree ("code");--> statement-breakpoint
CREATE INDEX "tickets_order_id_idx" ON "tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tickets_event_id_idx" ON "tickets" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tickets_event_status_idx" ON "tickets" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_org_url_lower_idx" ON "users" USING btree (lower("org_url")) WHERE "users"."org_url" is not null;--> statement-breakpoint
CREATE INDEX "venues_user_id_idx" ON "venues" USING btree ("user_id");