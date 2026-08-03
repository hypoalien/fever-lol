"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { format } from "date-fns";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  MoreHorizontal,
  PencilIcon,
  PlusCircle,
  Send,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, LoadError } from "@/components/dashboard/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage } from "@/lib/errors";
import { formatMinor } from "@/lib/money";
import {
  useDeleteEvent,
  useEvents,
  usePublishEvent,
  type EventSummary,
} from "@/lib/query/hooks";

/**
 * The events list.
 *
 * Every event carries its own currency, so prices are formatted with
 * `formatMinor` rather than divided by a hundred and handed to the
 * organizer-wide formatter — the old version printed ¥5,000 as ¥50.
 *
 * Publish and delete run through the shared mutations, so the card moves the
 * moment it is clicked instead of after a refetch.
 */

type Tab = "all" | "draft" | "active" | "completed";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "On sale" },
  { value: "draft", label: "Drafts" },
  { value: "completed", label: "Past" },
];

/** The soonest date the event runs, or null if no dates are set yet. */
function firstDate(event: EventSummary): Date | null {
  if (!event.timings.length) return null;
  const times = event.timings.map((timing) => new Date(timing.date).getTime());
  return new Date(Math.min(...times));
}

function priceLabel(event: EventSummary): string {
  if (!event.ticketVariants.length) return "No tickets yet";
  const lowest = Math.min(
    ...event.ticketVariants.map((variant) => variant.priceMinor)
  );
  return lowest === 0
    ? "Free"
    : `From ${formatMinor(lowest, event.currency)}`;
}

export default function EventsComponent() {
  const router = useRouter();
  const { data, isPending, isError, refetch } = useEvents();
  const publish = usePublishEvent();
  const remove = useDeleteEvent();

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EventSummary | null>(null);

  const events = useMemo(() => data ?? [], [data]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesTab =
        tab === "all" ||
        (tab === "draft" ? !event.status || event.status === "draft" : event.status === tab);

      if (!matchesTab) return false;
      if (!needle) return true;

      // Search over what is actually on the card, not the whole JSON blob —
      // stringifying the record meant a search for "draft" matched every
      // event through its status field and a UUID fragment matched at random.
      return [event.eventName, event.venue?.venueName, event.venue?.city]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [events, tab, query]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data: created } = await axios.post<{ id: string }>(
        "/api/events/create-event"
      );
      router.push(`/dashboard/events/create-event?eventId=${created.id}`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not start a new event"));
      setCreating(false);
    }
  };

  const createButton = (
    <Button onClick={handleCreate} size="sm" disabled={creating}>
      {creating ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <PlusCircle className="mr-2 size-4" />
      )}
      New event
    </Button>
  );

  if (isError) {
    return (
      <LoadError title="Could not load your events" onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <TabsList>
            {TABS.map((entry) => (
              <TabsTrigger key={entry.value} value={entry.value}>
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-1 items-center gap-3 lg:justify-end">
          <Input
            placeholder="Search by name or venue"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="lg:w-64"
          />
          {createButton}
        </div>
      </div>

      {isPending ? (
        <CardGridSkeleton cards={4} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={events.length === 0 ? "No events yet" : "Nothing matches that"}
          description={
            events.length === 0
              ? "Start one, add your ticket types, and publish when you are ready."
              : "Try a different search, or switch tabs."
          }
          action={events.length === 0 ? createButton : undefined}
        />
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {visible.map((event) => {
            const date = firstDate(event);
            const name = event.eventName ?? "Untitled event";

            return (
              <StaggerItem key={event.id}>
                <Card className="flex h-full gap-4 p-4 transition-colors hover:border-foreground/20">
                  <Image
                    src={event.eventFlyer || "/placeholder.svg"}
                    alt=""
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] shrink-0 rounded-md object-cover"
                    priority={false}
                  />

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/events/create-event?eventId=${event.id}`
                            )
                          }
                          className="line-clamp-1 text-left font-medium hover:underline"
                        >
                          {name}
                        </button>
                        <Badge
                          variant={
                            event.status === "active" ? "default" : "outline"
                          }
                          className="mt-1.5"
                        >
                          {event.status === "active"
                            ? "On sale"
                            : event.status === "draft"
                              ? "Draft"
                              : event.status === "completed"
                                ? "Past"
                                : "Cancelled"}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-label={`Actions for ${name}`}
                            variant="ghost"
                            size="icon"
                            className="-mr-1 -mt-1 size-8 shrink-0"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/dashboard/events/create-event?eventId=${event.id}`
                              )
                            }
                          >
                            <PencilIcon className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          {event.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() =>
                                publish.mutate(event.id, {
                                  onSuccess: () =>
                                    toast.success(`${name} is on sale`),
                                  onError: (error) =>
                                    toast.error(
                                      errorMessage(
                                        error,
                                        "Could not publish this event"
                                      )
                                    ),
                                })
                              }
                            >
                              <Send className="mr-2 size-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/dashboard/orders?eventId=${event.id}`)
                            }
                          >
                            <ShoppingCart className="mr-2 size-4" />
                            Orders
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              // Absolute: this was a relative path, so from the
                              // events page it navigated to
                              // /dashboard/events/dashboard/attendees.
                              router.push(
                                `/dashboard/attendees?eventId=${event.id}`
                              )
                            }
                          >
                            <Users className="mr-2 size-4" />
                            Attendees
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/events/${event.id}`, "_blank")
                            }
                          >
                            <ExternalLink className="mr-2 size-4" />
                            View public page
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDelete(event)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0" />
                        {date ? format(date, "EEE d MMM yyyy") : "No date set"}
                      </p>
                      {event.venue && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="line-clamp-1">
                            {[event.venue.venueName, event.venue.city]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Tag className="size-3.5 shrink-0" />
                        {priceLabel(event)}
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete {pendingDelete?.eventName ?? "this event"}?
            </DialogTitle>
            <DialogDescription>
              This cannot be undone. Events that already have orders cannot be
              deleted — cancel them instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pendingDelete) return;
                const name = pendingDelete.eventName ?? "Event";
                remove.mutate(pendingDelete.id, {
                  onSuccess: () => toast.success(`Deleted ${name}`),
                  onError: (error) =>
                    toast.error(
                      errorMessage(error, "Could not delete this event")
                    ),
                });
                setPendingDelete(null);
              }}
            >
              Delete event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
