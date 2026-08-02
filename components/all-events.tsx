"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  PlusCircle,
  MapPin,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Tag,
  PencilIcon,
  ExternalLinkIcon,
  Users,
  ShoppingCart,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { usePrice } from "@/hooks/use-price";
interface Timing {
  date: string;
  startTime: string;
  endTime: string;
}

interface Venue {
  id?: string;
  venueName: string;
  city: string;
  state: string;
}

interface TicketVariant {
  type: string;
  /** Integer minor units, as the API returns them. */
  priceMinor: number;
}

interface Event {
  id: string;
  eventName: string;
  eventFlyer: string;
  status: string;
  venue: Venue | null;
  timings: Timing[];
  ticketVariants: TicketVariant[];
}
export default function EventsComponent() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  // No range by default. This was hardcoded to Jan 2024 - Feb 2025, which
  // quietly hid every event outside that window — including all future ones,
  // for anyone using this after early 2025.
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.post("/api/events");
        setEvents(response.data.reverse()); // Reverse the order of events
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const filterEvents = () => {
      interface Timing {
        date: string;
        startTime: string;
        endTime: string;
      }

      interface Event {
        id: string;
        status?: string;
        timings?: Timing[];
        // Anything else the endpoint returns is not read here.
        [key: string]: unknown;
      }

      const filtered = events.filter((event: Event) => {
        // Handle earliest date calculation with proper type safety
        const earliestDate = event.timings?.length
          ? new Date(
              Math.min(
                ...event.timings.map((t: Timing) => new Date(t.date).getTime())
              )
            )
          : null;

        // Convert event to string for search, with null check
        const eventValuesString = JSON.stringify(event || {}).toLowerCase();
        const matchesSearch = eventValuesString.includes(
          (searchQuery || "").toLowerCase()
        );

        // Type-safe tab matching
        const matchesTab = (() => {
          switch (selectedTab) {
            case "all":
              return true;
            case "draft":
              return event.status === "draft" || !event.status;
            case "active":
              return event.status === "active";
            case "completed":
              return event.status === "completed";
            default:
              return false;
          }
        })();

        // Safe date range comparison
        const matchesDateRange =
          date?.from && date?.to && earliestDate
            ? earliestDate >= date.from && earliestDate <= date.to
            : true;

        return matchesTab && matchesSearch && matchesDateRange;
      });

      setFilteredEvents(filtered);
    };

    filterEvents();
  }, [events, selectedTab, searchQuery, date]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between mb-6">
          <TabsList className="flex-shrink-0 w-full lg:w-auto overflow-x-auto">
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="active">Upcoming Events</TabsTrigger>
            <TabsTrigger value="completed">Past Events</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
          </TabsList>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <Input
              placeholder="Search Events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:w-[250px]"
            />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-[250px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <TabsContent value={selectedTab} className="mt-4">
          <EventCardTable events={filteredEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
const EventCardTable = ({ events }: { events: Event[] }) => {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.ceil(events.length / pageSize);
  const paginatedEvents = events.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );
  const { formatPrice } = usePrice();
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      setPageIndex(newPage);
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const handleCreateEvent = async () => {
    setIsCreating(true);
    try {
      const response = await axios.post("/api/events/create-event");
      const { id } = response.data;
      router.push(`/dashboard/events/create-event?eventId=${id}`);
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatTicketsPrice = (ticketVariants: TicketVariant[]) => {
    if (!ticketVariants?.length) return "Price not set";
    const lowestMinor = Math.min(...ticketVariants.map((v) => v.priceMinor));
    return `From ${formatPrice(lowestMinor / 100)}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            Manage your events and view their performance
          </CardDescription>
        </div>
        <Button
          onClick={handleCreateEvent}
          size="sm"
          className="gap-2"
          disabled={isCreating}
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          Add Event
        </Button>
      </CardHeader>

      <CardContent>
        {paginatedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">No events found</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Create your first event to get started
            </p>
            <Button
              onClick={handleCreateEvent}
              size="sm"
              className="gap-2 mt-4"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Add Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {paginatedEvents.map((event) => (
              <Card key={event.id} className="flex flex-col">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <Image
                      src={event.eventFlyer || "/placeholder.svg"}
                      alt={event.eventName}
                      width={80}
                      height={80}
                      className="object-cover rounded-lg"
                      priority={false}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold line-clamp-1">
                            {event.eventName}
                          </h3>
                          {event.status && (
                            <Badge
                              variant={
                                event.status === "draft" ? "outline" : "default"
                              }
                              className="mt-1"
                            >
                              {event.status.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/dashboard/events/create-event?eventId=${event.id}`
                              )
                            }
                            className="h-8 w-8"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>

                          {/* Open in New Tab Icon */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              window.open(`/events/${event.id}`, "_blank")
                            }
                            className="h-8 w-8"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/events/create-event?eventId=${event.id}`
                                  )
                                }
                              >
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Edit Event
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/dashboard/orders?eventId=${event.id}`
                                  )
                                }
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                View Orders
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `dashboard/attendees?eventId=${event.id}`
                                  )
                                }
                              >
                                <Users className="h-4 w-4 mr-2" />
                                View Attendees
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/events/${event.id}`, "_blank")
                                }
                              >
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                View Event
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {event.timings?.[0] && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>
                              {format(
                                new Date(event.timings[0].date),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </p>
                        )}
                        {event.venue && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">
                              {`${event.venue.venueName}, ${event.venue.city}`}
                            </span>
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          {formatTicketsPrice(event.ticketVariants)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {paginatedEvents.length > 0 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6">
          <div className="text-sm text-muted-foreground">
            Showing {pageIndex * pageSize + 1}-
            {Math.min((pageIndex + 1) * pageSize, events.length)} of{" "}
            {events.length} events
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} rows
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(0)}
                disabled={pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pageIndex - 1)}
                disabled={pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {pageIndex + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pageCount - 1)}
                disabled={pageIndex >= pageCount - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
