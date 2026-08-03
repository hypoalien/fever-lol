"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  Copy,
  Info,
  Check,
  PlusIcon,
  MinusIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "./ui/separator";
import TruncateText from "@/components/turncat-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Image from "next/image";

interface Timing {
  date: string;
  startTime: string;
  endTime: string;
}

interface TicketVariant {
  id: string;
  type: string;
  description: string | null;
  /** Integer minor units, priced server-side. */
  priceMinor: number;
  remaining: number;
}

interface Venue {
  id?: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  mapsUrl: string;
  timeZone: string;
}

interface Event {
  id: string;
  eventName: string;
  eventDescription: string;
  eventFlyer: string;
  timings: Timing[];
  eventId: string;
  paymentGatewayFee: string;
  platformFee: string;
  ticketVariants: TicketVariant[];
  venue: Venue;
  hostEmail: string;
  currency: string;
}

interface SelectedTicket extends TicketVariant {
  quantity: number;
}

export function EventHomeDetails() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const response = await axios.get<Event>(
          `/api/public/events/${params.eventId}`
        );
        setEvent(response.data);
        setIsLoading(false);
      } catch (err) {
        setError("Failed to fetch event details");
        console.error(err);
        setIsLoading(false);
      }
    };

    if (params.eventId) {
      fetchEventDetails();
    }
  }, [params.eventId]);

  useEffect(() => {
    if (event?.ticketVariants) {
      setSelectedTickets(
        event.ticketVariants.map((variant) => ({
          ...variant,
          quantity: 0,
        }))
      );
    }
  }, [event?.ticketVariants]);

  const handleTicketQuantityChange = (index: number, quantity: number) => {
    setSelectedTickets((prevState) => {
      const updatedTickets = [...prevState];
      if (updatedTickets[index]) {
        updatedTickets[index].quantity = Math.max(
          0,
          Math.min(quantity, updatedTickets[index].remaining)
        );
      }
      return updatedTickets;
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const formattedHours = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  const handleCheckout = async () => {
    try {
      // Send quantities only — the server prices the cart from the event
      // record, so anything we put here beyond type and quantity is ignored.
      const cartItems = selectedTickets
        .filter((ticket) => ticket.quantity > 0)
        .map((ticket) => ({ type: ticket.type, quantity: ticket.quantity }));
      if (!event?.id || cartItems.length === 0) return;

      const response = await axios.post("/api/checkout", {
        cart: cartItems,
        eventId: event.id,
      });

      const { checkoutId } = response.data;
      router.push(`/checkout/${checkoutId}`);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Checkout error:", error);
      setError("Checkout failed. Please try again.");
    }
  };

  const totalMinor = selectedTickets.reduce(
    (total, ticket) => total + ticket.priceMinor * ticket.quantity,
    0
  );

  const lowestPriceMinor = event?.ticketVariants?.length
    ? Math.min(...event.ticketVariants.map((variant) => variant.priceMinor))
    : 0;

  const formatPrice = (minor: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: event?.currency ?? "USD",
    }).format(minor / 100);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!event) return <div>Event not found</div>;

  // // Format date
  const eventDate = new Date(event?.timings[0].date);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleCopy = () => {
    const address = `${event.venue.address}, ${event.venue.city}, ${event.venue.state}, ${event.venue.country}`;
    navigator.clipboard.writeText(address).then(
      () => {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000); // Clear message after 2 seconds
      },
      (err) => {
        console.error("Failed to copy address:", err);
      }
    );
  };

  return (
    <div className="relative flex w-full min-h-dvh items-center justify-center bg-background px-4 md:px-6">
      <div className="absolute top-[-100px] inset-0 z-0 h-3/4 w-full overflow-hidden">
        <Image
          src={event.eventFlyer}
          alt="Background"
          fill
          className="object-cover object-center opacity-40 blur-[50px] -left-[100px] -right-[100px]"
          quality={10}
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background opacity-100"></div>
      </div>
      <div className="container relative z-10 grid grid-cols-1 gap-8 py-12 md:grid-cols-3 md:gap-12 lg:gap-16">
        <div className="md:sticky top-32 w-full aspect-square max-w-[600px] overflow-hidden rounded-xl md:col-span-1">
          <Image
            src={event.eventFlyer}
            alt="Event Flyer"
            width={600}
            height={600}
            className="object-cover object-center"
            priority={true}
          />
        </div>
        <div className="flex flex-col items-start justify-center space-y-6 md:col-span-2 overflow-auto">
          <div className="space-y-2 w-full">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {event.eventName}
            </h1>

            <div className="mt-2 text-lg font-semibold text-muted-foreground">
              {event.venue.venueName}
              <span className="mx-2">|</span>
              {formattedDate}
            </div>
            <div className="w-full pt-8">
              <Card className="w-full shadow-none">
                <CardContent className="flex items-center justify-between gap-4 p-6">
                  <div>
                    <div className="text-2xl font-bold">
                      From {formatPrice(lowestPriceMinor)}
                    </div>
                    <p className="text-muted-foreground">
                      The price you&apos;ll pay. No surprises later.
                    </p>
                  </div>
                  <Button onClick={() => setIsDrawerOpen(true)}>Buy Now</Button>
                </CardContent>
              </Card>
            </div>
            <p className="pt-8 text-lg font-semibold md:text-3xl">About</p>
            <TruncateText text={event.eventDescription} maxLength={200} />
          </div>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Date</p>
                <p className="text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Time</p>
                <p className="text-muted-foreground">
                  {" "}
                  {formatTime(event.timings[0].startTime)} -{" "}
                  {formatTime(event.timings[0].endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-muted-foreground">
                  {event.venue.address}, {event.venue.city}, {event.venue.state}
                </p>
              </div>
            </div>
          </div>
          <div className="w-full border-t pt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Venue</h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">
                    {event.venue.venueName}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    {event.venue.address}, {event.venue.city},{" "}
                    {event.venue.state}, {event.venue.country}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={"link"}
                          onClick={handleCopy}
                          className="flex items-center gap-1"
                        >
                          {hasCopied ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-black text-white">
                        Copy code
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      Doors Open at {formatTime(event.timings[0].startTime)} IST
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-muted-foreground">
                      {event.venue.capacity} capacity
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(event.venue.mapsUrl, "_blank")}
                    variant="outline"
                    size="sm"
                    className="self-start flex items-center gap-1"
                  >
                    <MapPinIcon className="h-4 w-4" />
                    Open in maps
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full border-t pt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Lineup</h2>
              <div className="flex flex-col gap-2">
                {event.timings.map((timing, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="px-4">
                        <Separator
                          orientation="vertical"
                          className="h-8 text-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Day-{index + 1} start
                        </p>
                        <p className="text-muted-foreground">
                          Doors Open at {formatTime(timing.startTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-4">
                        <Separator
                          orientation="vertical"
                          className="h-8 text-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Day-{index + 1} end
                        </p>
                        <p className="text-muted-foreground">
                          Ends at {formatTime(timing.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full border-t pt-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">FAQ</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Are refunds available?</AccordionTrigger>
                  <AccordionContent>
                    No refunds after booking. Refunds for canceled events will
                    be managed by the organizer at their own discretion.
                    Contact: {event.hostEmail}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    Is alcohol or drugs allowed?
                  </AccordionTrigger>
                  <AccordionContent>
                    No, drugs and alcohol are strictly prohibited at the event.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    What is the age limit for the event?
                  </AccordionTrigger>
                  <AccordionContent>
                    The event is strictly for individuals aged 21 and above.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    What should I bring to the event?
                  </AccordionTrigger>
                  <AccordionContent>
                    Bring your ticket (digital or printed), a valid ID, and any
                    personal items you may need. Please avoid bringing
                    prohibited items such as drugs, alcohol, and weapons.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-8">
                  <AccordionTrigger>Is re-entry allowed?</AccordionTrigger>
                  <AccordionContent>
                    No, re-entry is not allowed once you leave the event
                    premises.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>
      {/* Add this sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold">
                From {formatPrice(lowestPriceMinor)}
              </div>
              <p className="text-sm text-muted-foreground">
                Including all taxes
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setIsDrawerOpen(true)}
              className="px-8"
            >
              Buy Now
            </Button>
          </div>
        </div>
      </div>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="w-full">
          <div className="max-w-xl self-center">
            <DrawerHeader>
              <DrawerTitle>Select Tickets</DrawerTitle>
              <DrawerDescription>
                Choose the number of tickets you&apos;d like to purchase.
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4">
              {selectedTickets.map((ticket, index) => (
                <div
                  key={ticket.type}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{ticket.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.description}
                    </p>
                    <p className="text-muted-foreground">
                      {formatPrice(ticket.priceMinor)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleTicketQuantityChange(index, ticket.quantity - 1)
                      }
                      disabled={ticket.quantity <= 0}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                    <div className="w-12 text-center">{ticket.quantity}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleTicketQuantityChange(index, ticket.quantity + 1)
                      }
                      disabled={ticket.quantity >= ticket.remaining}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DrawerFooter>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    Total: {formatPrice(totalMinor)}
                  </p>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={totalMinor === 0}
                >
                  Checkout
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
