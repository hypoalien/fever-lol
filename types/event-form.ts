import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

/**
 * The event editor's form shape.
 *
 * Lives here rather than in the form component so the sub-components can take
 * a properly typed `form` prop. They previously took `{ form }: any`, which
 * meant a renamed field failed at runtime instead of at the type level.
 */
export const eventFormSchema = z.object({
  eventName: z.string().min(6, "Event name must be at least 6 characters."),
  eventDescription: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  // Nullable because the editor clears it; publish validation is what
  // actually requires a flyer.
  eventFlyer: z.string({ error: "Event flyer is required" }).nullable(),
  timings: z
    .array(
      z.object({
        date: z.date({ error: "Start date is required." }),
        startTime: z.string().min(1, "Start time is required"),
        endTime: z.string().min(1, "End time is required"),
      })
    )
    .nonempty("At least one timing is required."),
  promoCodes: z.array(
    z.object({
      code: z.string(),
      // The editor only ever produces these two, and the pricing code
      // switches on them — a bare string let a third value through.
      discountType: z.enum(["flat", "percent"]),
      discountValue: z.number(),
      minOrderValue: z.number().optional(),
      maxDiscount: z.number().optional(),
    })
  ),
  status: z.string(),
  ticketVariants: z
    .array(
      z.object({
        type: z.string().min(2, "Ticket name must be at least 2 characters."),
        description: z
          .string()
          .min(6, "Description must be at least 6 characters."),
        quantity: z.string().optional(),
        remaining: z.string().optional(),
        price: z.string({ error: "Ticket price is required" }),
      })
    )
    .optional(),
  platformFee: z.string({
    error: "Please select who pays the platform fee",
  }),
  paymentGatewayFee: z.string({
    error: "Please select who pays the processing fee",
  }),
  // Mirrors VenueView. Only the id is sent on save — the rest is here so the
  // selected venue can be shown without a second fetch. It previously demanded
  // a required `timeZone` and non-null strings, neither of which the venues
  // API returns, so picking a venue failed validation and blocked the save.
  venue: z
    .object({
      id: z.string(),
      venueName: z.string(),
      address: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      country: z.string().nullable(),
      postalCode: z.string().nullable(),
      mapLink: z.string().nullable(),
      capacity: z.number().nullable(),
    })
    .nullable(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** What every event editor sub-component receives. */
export type EventForm = UseFormReturn<EventFormValues>;

export interface EventFormSectionProps {
  form: EventForm;
}
