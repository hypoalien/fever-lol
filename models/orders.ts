import { z } from "zod";

/**
 * The order row as the API returns it.
 *
 * Mirrors `listOrders` in lib/data/analytics.ts. All amounts are integer minor
 * units, matching the rest of the codebase; the table formats them for display.
 */
export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  currency: z.string(),
  subtotalMinor: z.number(),
  discountMinor: z.number(),
  gatewayFeeMinor: z.number(),
  platformFeeMinor: z.number(),
  totalMinor: z.number(),
  payoutMinor: z.number(),
  paymentStatus: z.enum([
    "pending",
    "authorized",
    "completed",
    "failed",
    "refunded",
  ]),
  orderStatus: z.enum(["confirmed", "cancelled", "refunded"]),
  payoutStatus: z.enum(["pending", "processing", "completed", "failed"]),
  eventId: z.string(),
  eventName: z.string().nullable(),
  createdAt: z.string(),

  /** Denormalised for the detail sheet, so opening a row costs no request. */
  event: z.object({
    name: z.string().nullable(),
    venue: z.string().nullable(),
    address: z.string().nullable(),
    startsAt: z.string().nullable(),
  }),
  items: z.array(
    z.object({
      type: z.string(),
      quantity: z.number(),
      unitPriceMinor: z.number(),
      lineTotalMinor: z.number(),
    })
  ),
});

export type Order = z.infer<typeof OrderSchema>;

export const OrdersResponseSchema = z.object({
  orders: z.array(OrderSchema),
});
