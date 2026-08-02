"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Building2, Plus, Search } from "lucide-react";

import { EmptyState, LoadError } from "@/components/dashboard/page-shell";
import { VenueCard } from "@/components/venue-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/ui/motion";
import { CardGridSkeleton } from "@/components/ui/skeletons";
import { keys, useVenues, type VenueSummary } from "@/lib/query/hooks";


export function VenuesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isPending, isError, refetch } = useVenues();
  const client = useQueryClient();
  // The dialog lives in VenueCard but is opened from here, through the URL
  // state both components read — so the toolbar keeps its one row.
  const [, setEditVenue] = useQueryState("editVenue");

  /**
   * VenueCard adds and removes rows through a `useState` setter. Rather than
   * duplicating its list in local state — which would go stale the moment the
   * cache revalidated — the same setter shape is adapted onto the cache, so a
   * created or deleted venue shows immediately and survives navigation.
   */
  const setVenues = useCallback<React.Dispatch<React.SetStateAction<VenueSummary[]>>>(
    (update) => {
      client.setQueryData<VenueSummary[]>(keys.venues, (previous) => {
        const current = previous ?? [];
        return typeof update === "function" ? update(current) : update;
      });
    },
    [client]
  );

  if (isError) {
    return (
      <LoadError title="Could not load venues" onRetry={() => void refetch()} />
    );
  }

  if (isPending) return <CardGridSkeleton cards={4} />;

  const query = searchQuery.toLowerCase();
  const filtered = data.filter((venue) =>
    Object.values(venue)
      .filter((value) => value !== undefined && value !== null)
      .map((value) => String(value).toLowerCase())
      .join(" ")
      .includes(query)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {data.length} {data.length === 1 ? "venue" : "venues"}
        </p>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city or address"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={() => void setEditVenue("new")}>
          <Plus className="mr-2 size-4" />
          Add venue
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No venues yet"
          description="Add the places you run events at once, then pick them when you create an event."
          action={
            <Button size="sm" onClick={() => void setEditVenue("new")}>
              <Plus className="mr-2 size-4" />
              Add your first venue
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="size-5" />}
          title="Nothing matches that"
          description="Name, city and address are all searched — try a shorter term."
        />
      ) : null}

      <FadeIn>
        {/* VenueCard renders the grid and owns the add/edit dialog. */}
        <VenueCard venues={filtered} setVenues={setVenues} />
      </FadeIn>
    </div>
  );
}
