"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventFormSectionProps } from "@/types/event-form";

export function EventTicketPricingFees({ form }: EventFormSectionProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Ticket Pricing Fees</CardTitle>
        <CardDescription>Who will pay the ticketing fees?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="paymentGatewayFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Processing Fee</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select who pays the processing fee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      Paid by user (added to ticket price)
                    </SelectItem>
                    <SelectItem value="organizer">
                      Paid by the organizer (cut from payout)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                Choose who will cover the payment processing fee
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
