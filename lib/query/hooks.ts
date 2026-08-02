"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import axios from "axios";

import type { Attendee } from "@/models/attendees";
import type { Order } from "@/models/orders";

/**
 * Every dashboard read and write, in one place.
 *
 * Keys are namespaced by resource so a mutation can invalidate exactly what it
 * affected rather than everything. `prefetch` is exported so navigation can
 * warm the cache on hover — the difference between a screen that appears and a
 * screen that loads.
 */

export const keys = {
  analytics: ["analytics"] as const,
  events: ["events"] as const,
  event: (id: string) => ["events", id] as const,
  venues: ["venues"] as const,
  orders: (eventId?: string) => ["orders", eventId ?? "all"] as const,
  attendees: (eventId?: string) => ["attendees", eventId ?? "all"] as const,
  discounts: ["discounts"] as const,
  profile: ["profile"] as const,
};

/* ------------------------------------------------------------------ types -- */

export interface DashboardStats {
  currency: string;
  totalRevenue: { amountMinor: number; percentageChange: number };
  salesToday: { amountMinor: number; percentageChange: number };
  ticketsSold: { count: number; percentageChange: number };
  activeEvents: { count: number; change: number };
  overview: Array<{ name: string; totalMinor: number }>;
  recentSales: Array<{
    id: string;
    name: string;
    email: string;
    amountMinor: number;
    date: string;
  }>;
}

export interface EventSummary {
  id: string;
  eventName: string | null;
  slug: string | null;
  description: string | null;
  eventFlyer: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  currency: string;
  timings: Array<{ id: string; date: string; startTime: string }>;
  ticketVariants: Array<{
    id: string;
    type: string;
    priceMinor: number;
    quantity: number;
    remaining: number;
  }>;
  venue: { id: string; venueName: string; city: string | null } | null;
}

/** Mirrors VenueView in lib/data/venues.ts — what GET /api/venues returns. */
export interface VenueSummary {
  id: string;
  venueName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  mapLink: string | null;
  capacity: number | null;
}

export interface PromoCodeSummary {
  id: string;
  code: string;
  eventId: string;
  eventName: string | null;
  discountType: "flat" | "percent";
  discountValue: number;
  minOrderMinor: number;
  timesRedeemed: number;
  maxRedemptions: number | null;
  active: boolean;
  expiresAt: string | null;
  currency: string;
}

/* ----------------------------------------------------------------- reads -- */

const get = async <T,>(url: string): Promise<T> =>
  (await axios.get<T>(url)).data;

const post = async <T,>(url: string, body: unknown = {}): Promise<T> =>
  (await axios.post<T>(url, body)).data;

export function useDashboardStats() {
  return useQuery({
    queryKey: keys.analytics,
    queryFn: () => get<DashboardStats>("/api/analytics"),
  });
}

export function useEvents() {
  return useQuery({
    queryKey: keys.events,
    queryFn: () => post<EventSummary[]>("/api/events"),
  });
}

export function useVenues() {
  return useQuery({
    queryKey: keys.venues,
    queryFn: () => get<VenueSummary[]>("/api/venues"),
  });
}

export function useOrders(eventId?: string) {
  return useQuery({
    queryKey: keys.orders(eventId),
    queryFn: async () =>
      (await post<{ orders: Order[] }>("/api/orders", eventId ? { eventId } : {}))
        .orders,
  });
}

export function useAttendees(eventId?: string) {
  return useQuery({
    queryKey: keys.attendees(eventId),
    queryFn: async () =>
      (
        await post<{ attendees: Attendee[] }>(
          "/api/attendees",
          eventId ? { eventId } : {}
        )
      ).attendees,
  });
}

export function useDiscounts() {
  return useQuery({
    queryKey: keys.discounts,
    queryFn: async () =>
      (await get<{ promoCodes: PromoCodeSummary[] }>("/api/discounts"))
        .promoCodes,
  });
}

/* ------------------------------------------------------------- prefetches -- */

/**
 * Warm a route's data before the user commits to it.
 *
 * Called on hover and focus of a nav link. By the time the click lands the
 * request is usually already resolved, so the destination paints with content
 * instead of a skeleton.
 */
export function prefetchRoute(client: QueryClient, path: string): void {
  const warm = <T,>(key: readonly unknown[], fn: () => Promise<T>) =>
    void client.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: 30_000 });

  switch (path) {
    case "/dashboard":
      warm(keys.analytics, () => get<DashboardStats>("/api/analytics"));
      break;
    case "/dashboard/events":
      warm(keys.events, () => post<EventSummary[]>("/api/events"));
      break;
    case "/dashboard/venues":
      warm(keys.venues, () => get<VenueSummary[]>("/api/venues"));
      break;
    case "/dashboard/orders":
      warm(keys.orders(), async () =>
        (await post<{ orders: Order[] }>("/api/orders", {})).orders
      );
      break;
    case "/dashboard/attendees":
      warm(keys.attendees(), async () =>
        (await post<{ attendees: Attendee[] }>("/api/attendees", {})).attendees
      );
      break;
    case "/dashboard/discounts":
      warm(keys.discounts, async () =>
        (await get<{ promoCodes: PromoCodeSummary[] }>("/api/discounts"))
          .promoCodes
      );
      break;
  }
}

/* ------------------------------------------------------------- mutations -- */

/**
 * Check a ticket in.
 *
 * Optimistic: the row flips the moment it is clicked and rolls back if the
 * server disagrees. Waiting for the round trip is the difference between an
 * app that feels immediate and one that feels remote — and door staff are
 * scanning against a queue of people.
 */
export function useCheckInTicket(eventId?: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const result = await post<{ success: boolean; message?: string }>(
        "/api/tickets/validate/single-ticket",
        { ticketId: code }
      );
      // The endpoint answers 200 with success:false for an already-used or
      // unknown ticket. Resolving on that would leave the optimistic row
      // checked in against a server that refused, so it is thrown instead.
      if (!result.success) {
        throw new Error(result.message ?? "Could not check this ticket in");
      }
      return result;
    },

    onMutate: async (code: string) => {
      const key = keys.attendees(eventId);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Attendee[]>(key);

      client.setQueryData<Attendee[]>(key, (rows) =>
        rows?.map((row) =>
          row.code === code
            ? { ...row, status: "checked_in", checkedInAt: new Date().toISOString() }
            : row
        )
      );

      return { previous, key };
    },

    onError: (_error, _code, context) => {
      if (context) client.setQueryData(context.key, context.previous);
    },

    onSettled: (_data, _error, _code, context) => {
      if (context) void client.invalidateQueries({ queryKey: context.key });
    },
  });
}

/** Publish an event, moving it in the cached list without a refetch. */
export function usePublishEvent() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) =>
      post(`/api/events/${eventId}`, { status: "active" }),

    onMutate: async (eventId: string) => {
      await client.cancelQueries({ queryKey: keys.events });
      const previous = client.getQueryData<EventSummary[]>(keys.events);

      client.setQueryData<EventSummary[]>(keys.events, (rows) =>
        rows?.map((row) =>
          row.id === eventId ? { ...row, status: "active" as const } : row
        )
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      client.setQueryData(keys.events, context?.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.events });
      void client.invalidateQueries({ queryKey: keys.analytics });
    },
  });
}

/** Delete an event, removing it from the list immediately. */
export function useDeleteEvent() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      await axios.delete(`/api/events/${eventId}`);
    },

    onMutate: async (eventId: string) => {
      await client.cancelQueries({ queryKey: keys.events });
      const previous = client.getQueryData<EventSummary[]>(keys.events);
      client.setQueryData<EventSummary[]>(keys.events, (rows) =>
        rows?.filter((row) => row.id !== eventId)
      );
      return { previous };
    },

    onError: (_error, _id, context) => {
      client.setQueryData(keys.events, context?.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: keys.events });
    },
  });
}
