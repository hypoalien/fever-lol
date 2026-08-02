"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { format } from "date-fns";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const EventCardTable = ({ events }: { events: Event[] }) => {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.ceil(events.length / pageSize);
  const paginatedEvents = events.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

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

  const formatPrice = (ticketVariants: TicketVariant[]) => {
    if (!ticketVariants?.length) return "Price not set";
    const minPrice = Math.min(...ticketVariants.map((v) => v.priceMinor));
    return `From $${minPrice.toFixed(2)}`;
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
            <h3 className="text-xl font-semibold">No Events Found</h3>
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
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                              Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/events/${event.id}/orders`)
                              }
                            >
                              View Orders
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/events/${event.id}/attendees`)
                              }
                            >
                              View Attendees
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          {formatPrice(event.ticketVariants)}
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

export default EventCardTable;
