"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Globe, Loader2, Trash2 } from "lucide-react";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EventBasicDetails } from "@/components/event-basic-details";
import { EventFlyer } from "@/components/event-flyer";
import { EventTimeSlotsManager } from "@/components/event-time-slots-manager";
import { EventVenueSelection } from "@/components/event-venue-selection";
import { EventPromoCodeForm } from "@/components/event-promo-code-form";
import { EventTicketPricingFees } from "@/components/event-ticket-pricing-fee";
import { EventTicketVariant } from "@/components/event-ticket-variant";
import { EventStatusSelector } from "./event-status-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
const formSchema = z.object({
  eventName: z.string().min(6, "Event name must be at least 6 characters."),
  eventDescription: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  eventFlyer: z.string({ error: "Event flyer is required" }),
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
      discountType: z.string(),
      discountValue: z.number(),
      minOrderValue: z.number(),
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

  venue: z
    .object({
      id: z.string(),
      venueName: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
      country: z.string(),
      capacity: z.number(),
      timeZone: z.string(),
      mapsUrl: z.string().optional(),
    })
    .nullable(),
});

type FormSchema = z.infer<typeof formSchema>;

export default function EventForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventName: "",
      eventDescription: "",
      timings: [], // Changed from array with object to empty array
      ticketVariants: [], // Already empty array
      eventFlyer: "",
      promoCodes: [], // Already empty array
      status: "",
      venue: null, // Changed from object with empty values to null
      paymentGatewayFee: "",
    },
  });

  useEffect(() => {
    if (!eventId) return;
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/events/${eventId}`);

      // Set basic fields
      form.setValue("eventName", data.eventName);
      form.setValue("eventDescription", data.eventDescription);
      form.setValue("eventFlyer", data.eventFlyer);
      form.setValue("status", data.status);

      // Set arrays only if they exist
      if (data.timings?.length) {
        form.setValue(
          "timings",
          data.timings.map((timing: any) => ({
            date: new Date(timing.date),
            startTime: timing.startTime,
            endTime: timing.endTime,
          }))
        );
      }

      if (data.promoCodes?.length) {
        form.setValue("promoCodes", data.promoCodes);
      }

      if (data.ticketVariants?.length) {
        form.setValue("ticketVariants", data.ticketVariants);
      }

      // Set venue only if it exists
      if (data.venue?.id) {
        form.setValue("venue", {
          id: data.venue.id,
          venueName: data.venue.venueName,
          address: data.venue.address,
          city: data.venue.city,
          state: data.venue.state,
          country: data.venue.country,
          capacity: data.venue.capacity,
          timeZone: data.venue.timeZone,
          mapsUrl: data.venue.mapsUrl,
        });
      }

      // Set fee settings if they exist
      if (data.platformFee) {
        form.setValue("platformFee", data.platformFee);
      }
      if (data.paymentGatewayFee) {
        form.setValue("paymentGatewayFee", data.paymentGatewayFee);
      }
    } catch (error) {
      console.error("Error fetching event details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!eventId) return;
    setIsSaving(true);
    try {
      await axios.post(`/api/events/${eventId}`, form.getValues());
      toast.success("Event details saved successfully!");
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      await axios.delete(`/api/events/${eventId}`);
      window.location.href = "/dashboard/events";
      toast.success("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePublishConfirm = async () => {
    if (!eventId) return;
    setIsSaving(true);
    try {
      await handleSave();
      await axios.post(`/api/events/${eventId}`, { status: "active" });
      window.location.href = "/dashboard/events";
      toast.success("Event published successfully!");
    } catch (error) {
      console.error("Error publishing event:", error);
    } finally {
      setIsSaving(false);
      setShowPublishDialog(false);
    }
  };
  const onSubmit = async (data: FormSchema) => {
    console.log("Form submitted with values:", data);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="relative min-h-screen pb-20">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col space-y-2">
            <CardTitle>{eventId ? "Edit Event" : "Create New Event"}</CardTitle>
            <CardDescription>
              Fill in the details for your event.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-8">
                {/* Basic Details Section */}
                <section className="grid lg:grid-cols-[2fr_1fr] gap-8">
                  <EventBasicDetails form={form} />
                  <EventFlyer form={form} />
                </section>

                {/* Timing and Venue Section */}
                <section className="grid lg:grid-cols-[2fr_1fr] gap-6">
                  <div className="space-y-6">
                    <section className="grid lg:grid-cols-[2fr_2fr] gap-6">
                      <EventPromoCodeForm form={form} />
                      <EventTicketVariant form={form} />
                    </section>
                    <section className="grid lg:grid-cols-[2fr_2fr] gap-6">
                      <EventTimeSlotsManager form={form} />
                      <EventVenueSelection form={form} />
                    </section>
                  </div>
                  <div className="space-y-6">
                    <EventStatusSelector form={form} />
                    <EventTicketPricingFees form={form} />
                  </div>
                </section>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Sticky Bottom Navigation */}
      <div className="fixed bottom-0 left-[256px] right-0 bg-background border-t border-border p-4 shadow-lg">
        <div className="max-w-[calc(100%-2rem)] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {eventId && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Event
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {eventId && (
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            )}

            <Button
              variant="default"
              onClick={() =>
                eventId
                  ? setShowPublishDialog(true)
                  : form.handleSubmit(onSubmit)()
              }
              disabled={isLoading}
            >
              <Globe className="mr-2 h-4 w-4" />
              {eventId ? "Publish Event" : "Create Event"}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to publish this event? This will make it
              visible to all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handlePublishConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
