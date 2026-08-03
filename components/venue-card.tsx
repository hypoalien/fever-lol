"use client";

import { useState } from "react";
import axios from "axios";
import { useQueryState } from "nuqs";
import { Edit2, MapPin, MoreHorizontal, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  EMPTY_VENUE,
  VenueFormFields,
  VenueSubmit,
  toVenuePayload,
  validateVenue,
  type VenueFieldErrors,
  type VenueFormValues,
} from "@/components/venues/venue-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { countryName } from "@/lib/countries";
import { errorMessage } from "@/lib/errors";
import type { VenueSummary } from "@/lib/query/hooks";

/** The venue shape the API returns, defined once alongside the queries. */
export type Venue = VenueSummary;

/** "14 Wharf Road, Bristol, England BS1, United Kingdom" — blanks omitted. */
function formatAddress(venue: Venue): string {
  const locality = [venue.city, venue.state, venue.postalCode]
    .filter(Boolean)
    .join(" ");

  return [venue.address, locality, venue.country ? countryName(venue.country) : null]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

function toFormValues(venue: Venue): VenueFormValues {
  return {
    venueName: venue.venueName,
    address: venue.address ?? "",
    city: venue.city ?? "",
    state: venue.state ?? "",
    country: venue.country ?? "",
    postalCode: venue.postalCode ?? "",
    mapLink: venue.mapLink ?? "",
    capacity: venue.capacity === null ? "" : String(venue.capacity),
  };
}

/**
 * The venue list, as cards rather than a table.
 *
 * A venue is an address, and an address is a small block of text — reading one
 * across seven table columns meant scanning sideways to assemble something
 * that belongs together. The card puts the whole address in one paragraph,
 * which is also what makes it survive on a phone.
 *
 * The pagination that used to sit under the table is gone: an organizer has a
 * handful of venues, not hundreds, and the page-size control was more
 * machinery than the data justified.
 */
/**
 * The add/edit dialog.
 *
 * A separate component so its form state can be *initialised* from the venue
 * being edited rather than synced to it in an effect. The parent mounts it with
 * a key, so switching which venue is open remounts it with fresh values — no
 * effect, and no stale field left over from the last venue.
 */
function VenueDialog({
  venue,
  open,
  onOpenChange,
  onSaved,
}: {
  venue: Venue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (venue: Venue, created: boolean) => void;
}) {
  const [values, setValues] = useState<VenueFormValues>(() =>
    venue ? toFormValues(venue) : EMPTY_VENUE
  );
  const [errors, setErrors] = useState<VenueFieldErrors>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validateVenue(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const payload = toVenuePayload(values);
      const { data } = venue
        ? await axios.put<Venue>(`/api/venues/${venue.id}`, payload)
        : await axios.post<Venue>("/api/venues", payload);

      onSaved(data, venue === null);
      toast.success(venue ? "Venue saved" : "Venue added");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the venue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{venue ? "Edit venue" : "Add a venue"}</DialogTitle>
            <DialogDescription>
              Only the name is required. Everything else shows on the ticket
              page, so fill in what you know.
            </DialogDescription>
          </DialogHeader>

          <div className="py-5">
            <VenueFormFields
              values={values}
              onChange={setValues}
              errors={errors}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <VenueSubmit saving={saving} editing={venue !== null} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const VenueCard = ({
  venues,
  setVenues,
}: {
  venues: Venue[];
  setVenues: React.Dispatch<React.SetStateAction<Venue[]>>;
}) => {
  // ?editVenue=<id> is how the event editor sends an organizer here to fix an
  // address; "new" opens an empty form. Keeping it in the URL means the dialog
  // survives a refresh and can be linked to.
  const [editVenue, setEditVenue] = useQueryState("editVenue");
  const [pendingDelete, setPendingDelete] = useState<Venue | null>(null);

  const editing =
    editVenue && editVenue !== "new"
      ? (venues.find((venue) => venue.id === editVenue) ?? null)
      : null;

  const handleDelete = async (venue: Venue) => {
    setPendingDelete(null);
    try {
      await axios.delete(`/api/venues/${venue.id}`);
      setVenues((previous) =>
        previous.filter((candidate) => candidate.id !== venue.id)
      );
      toast.success(`Deleted ${venue.venueName}`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete the venue"));
    }
  };

  return (
    <div className="space-y-4">
      <VenueDialog
        // Remounts when the target changes, so the form always starts from the
        // venue being edited.
        key={editVenue ?? "closed"}
        venue={editing}
        open={editVenue !== null}
        onOpenChange={(next) => !next && void setEditVenue(null)}
        onSaved={(saved, created) =>
          setVenues((previous) =>
            created
              ? [...previous, saved].sort((a, b) =>
                  a.venueName.localeCompare(b.venueName)
                )
              : previous.map((venue) => (venue.id === saved.id ? saved : venue))
          )
        }
      />

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => {
          const address = formatAddress(venue);

          return (
            <StaggerItem key={venue.id}>
              <Card className="h-full transition-colors hover:border-foreground/20">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <CardTitle className="text-base leading-snug">
                    {venue.venueName}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`Actions for ${venue.venueName}`}
                        size="icon"
                        variant="ghost"
                        className="-mr-2 -mt-1 size-8 shrink-0"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => void setEditVenue(venue.id)}
                      >
                        <Edit2 className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setPendingDelete(venue)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {address || "No address yet"}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {venue.capacity !== null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        Holds {venue.capacity.toLocaleString()}
                      </span>
                    )}
                    {venue.mapLink && (
                      <a
                        href={venue.mapLink}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 hover:text-foreground"
                      >
                        <MapPin className="size-3.5" />
                        Open in maps
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.venueName}?</DialogTitle>
            <DialogDescription>
              Events already pointing at this venue keep their address. New
              events will not be able to choose it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && void handleDelete(pendingDelete)}
            >
              Delete venue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
