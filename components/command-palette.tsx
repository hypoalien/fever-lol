"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  CalendarDays,
  ExternalLink,
  LayoutDashboard,
  MapPin,
  PlusCircle,
  Search,
  Settings,
  ShoppingCart,
  TicketPercent,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { errorMessage } from "@/lib/errors";
import { prefetchRoute, useEvents, useVenues } from "@/lib/query/hooks";

/**
 * Cmd-K.
 *
 * Every screen in this dashboard was reachable only by moving a cursor to the
 * sidebar. The palette is the keyboard route to the same places, plus the two
 * things an organizer does most — start an event, jump to a specific one —
 * without a round trip through a list page.
 *
 * Results come from the shared cache, so opening it costs nothing when the
 * data is already held, and the sections it can reach are warmed on highlight
 * rather than on click.
 */

const ROUTES = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard/venues", label: "Venues", icon: MapPin },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/attendees", label: "Attendees", icon: Users },
  { href: "/dashboard/discounts", label: "Discounts", icon: TicketPercent },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Shared so the header button and the dialog agree on one open state without
 * either owning the other.
 */
const PaletteContext = createContext<{ open: () => void } | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  // Owned here, and toggled functionally, so the handler is registered once
  // and never reads a stale `isOpen` — previously it captured the value from
  // the render it was attached in, so a second press could fail to close.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      {/* Keyed on each opening so the search box starts empty rather than
          holding whatever was typed last time. */}
      <CommandPalette
        key={isOpen ? "open" : "closed"}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </PaletteContext.Provider>
  );
}

/**
 * "\u2318" on a Mac, "Ctrl" everywhere else.
 *
 * Read through useSyncExternalStore rather than an effect, so the server
 * renders "Ctrl", the client corrects it during hydration, and there is no
 * post-mount state write to cascade from. The platform never changes, so
 * there is nothing to subscribe to.
 */
const NO_SUBSCRIBE = () => () => {};

function useModifierKey(): string {
  return useSyncExternalStore(
    NO_SUBSCRIBE,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "\u2318" : "Ctrl"),
    () => "Ctrl"
  );
}

/** The header's search affordance — the palette's discoverable half. */
export function CommandTrigger() {
  const palette = useContext(PaletteContext);
  const modifier = useModifierKey();

  if (!palette) return null;

  return (
    <button
      type="button"
      onClick={palette.open}
      className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Search className="size-3.5" />
      <span>Search</span>
      <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">
        {modifier}K
      </kbd>
    </button>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setOpen = onOpenChange;
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const client = useQueryClient();

  // Only fetched once the palette has been opened, so the shortcut costs
  // nothing to have mounted on every dashboard page.
  const { data: events } = useEvents();
  const { data: venues } = useVenues();

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen]
  );

  const createEvent = useCallback(async () => {
    setOpen(false);
    setCreating(true);
    try {
      const { data } = await axios.post<{ id: string }>(
        "/api/events/create-event"
      );
      router.push(`/dashboard/events/create-event?eventId=${data.id}`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not start a new event"));
    } finally {
      setCreating(false);
    }
  }, [router, setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search, or jump to a section" />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        <CommandGroup heading="Actions">
          <CommandItem
            value="new event create"
            onSelect={() => void createEvent()}
            disabled={creating}
          >
            <PlusCircle className="mr-2 size-4" />
            New event
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          {ROUTES.map((route) => (
            <CommandItem
              key={route.href}
              value={route.label}
              onSelect={() => go(route.href)}
              // Warmed on highlight, so arrowing to a row is enough to have
              // its data in flight before Enter.
              onMouseEnter={() => prefetchRoute(client, route.href)}
            >
              <route.icon className="mr-2 size-4" />
              {route.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {events && events.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Events">
              {events.slice(0, 8).map((event) => (
                <CommandItem
                  key={event.id}
                  value={`event ${event.eventName ?? "untitled"}`}
                  onSelect={() =>
                    go(`/dashboard/events/create-event?eventId=${event.id}`)
                  }
                >
                  <CalendarDays className="mr-2 size-4" />
                  <span className="truncate">
                    {event.eventName ?? "Untitled event"}
                  </span>
                  <CommandShortcut>
                    {event.status === "active" ? "On sale" : "Draft"}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {venues && venues.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Venues">
              {venues.slice(0, 6).map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={`venue ${venue.venueName}`}
                  onSelect={() =>
                    go(`/dashboard/venues?editVenue=${venue.id}`)
                  }
                >
                  <MapPin className="mr-2 size-4" />
                  <span className="truncate">{venue.venueName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Elsewhere">
          <CommandItem
            value="public page organization"
            onSelect={() => {
              setOpen(false);
              window.open("/", "_blank");
            }}
          >
            <ExternalLink className="mr-2 size-4" />
            Open the public site
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
