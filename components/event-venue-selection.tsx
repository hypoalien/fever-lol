"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Building2, ChevronDown, MapPin, Plus, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormItem, FormMessage } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countryName } from "@/lib/countries";
import { errorMessage } from "@/lib/errors";
import { keys, useVenues, type VenueSummary } from "@/lib/query/hooks";
import type { EventFormSectionProps } from "@/types/event-form";

/** One line of address, blanks omitted. */
function summarise(venue: VenueSummary): string {
  return [venue.address, venue.city, venue.state, venue.country ? countryName(venue.country) : null]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

/**
 * Picking a venue for an event, and adding one without leaving the editor.
 *
 * The venue form here is the shared one, so an organizer sees the same fields
 * and the same labels as on the venues page. It used to be a second copy that
 * offered only United States and India, demanded a time zone the API does not
 * store, and sent a `mapsUrl` field the API silently dropped.
 */
export function EventVenueSelection({ form }: EventFormSectionProps) {
  const { data: venues, isPending } = useVenues();
  const client = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<VenueFormValues>(EMPTY_VENUE);
  const [errors, setErrors] = useState<VenueFieldErrors>({});

  const selected = form.watch("venue");

  const select = (venue: VenueSummary) => {
    form.setValue("venue", venue, { shouldDirty: true, shouldValidate: true });
    setPickerOpen(false);
  };

  const handleCreate = async () => {

    const found = validateVenue(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const { data } = await axios.post<VenueSummary>(
        "/api/venues",
        toVenuePayload(values)
      );
      // Written straight into the shared cache so the venues page shows it too,
      // rather than refetching a list this component already has.
      client.setQueryData<VenueSummary[]>(keys.venues, (previous) =>
        [...(previous ?? []), data].sort((a, b) =>
          a.venueName.localeCompare(b.venueName)
        )
      );
      select(data);
      setValues(EMPTY_VENUE);
      setDialogOpen(false);
      toast.success("Venue added");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the venue"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormItem>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Venue
          </CardTitle>
          <CardDescription>
            Where the event happens. Ticket holders see this address.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {selected ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{selected.venueName}</p>
                  <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {summarise(selected) || "No address on file"}
                  </p>
                  {selected.capacity !== null && (
                    <Badge variant="secondary" className="mt-2 gap-1.5">
                      <Users className="size-3" />
                      Holds {selected.capacity.toLocaleString()}
                    </Badge>
                  )}
                </div>

                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      Change
                      <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="end">
                    <VenuePicker
                      venues={venues ?? []}
                      loading={isPending}
                      onSelect={select}
                      onCreate={() => {
                        setPickerOpen(false);
                        setDialogOpen(true);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="flex-1">
                    Choose a venue
                    <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <VenuePicker
                    venues={venues ?? []}
                    loading={isPending}
                    onSelect={select}
                    onCreate={() => {
                      setPickerOpen(false);
                      setDialogOpen(true);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-2 size-4" />
                Add a new one
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {/* Not a nested <form>: this sits inside the event form, and nesting
              forms would make the inner submit fire the outer one. */}
          <div>
            <DialogHeader>
              <DialogTitle>Add a venue</DialogTitle>
              <DialogDescription>
                It is saved to your venues, so you can reuse it on the next
                event.
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
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <VenueSubmit
                saving={saving}
                editing={false}
                onClick={handleCreate}
              />
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <FormMessage />
    </FormItem>
  );
}

function VenuePicker({
  venues,
  loading,
  onSelect,
  onCreate,
}: {
  venues: VenueSummary[];
  loading: boolean;
  onSelect: (venue: VenueSummary) => void;
  onCreate: () => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Search your venues" />
      <CommandList>
        {loading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <CommandEmpty>No venue by that name.</CommandEmpty>
            <CommandGroup>
              {venues.map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={`${venue.venueName} ${summarise(venue)}`}
                  onSelect={() => onSelect(venue)}
                  className="flex flex-col items-start gap-0.5 px-3 py-2"
                >
                  <span className="font-medium">{venue.venueName}</span>
                  {summarise(venue) && (
                    <span className="truncate text-xs text-muted-foreground">
                      {summarise(venue)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandGroup className="border-t">
          <CommandItem onSelect={onCreate} className="px-3 py-2">
            <Plus className="mr-2 size-4" />
            Add a new venue
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
