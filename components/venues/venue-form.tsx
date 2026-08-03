"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  countryOptions,
  hasRegion,
  postalLabel,
  regionLabel,
} from "@/lib/countries";

/**
 * The one venue form.
 *
 * There used to be three of these — on the venues page, in the event editor,
 * and in a dialog nothing imported — and each carried its own copy of a
 * US-and-India-only state list. All three also collected a Google Maps URL and
 * a time zone that the API does not accept, so the map link an organizer typed
 * was quietly dropped on the way to the database and the time zone was a
 * required field for a value nothing stores.
 *
 * The fields here are exactly the columns the venue table has, and the labels
 * change with the country so a Japanese address asks for a prefecture rather
 * than a state.
 */

/** Mirrors VenueInputSchema — the fields the API actually accepts. */
export interface VenueFormValues {
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  mapLink: string;
  /** Empty while the field is blank; the API takes a number or nothing. */
  capacity: string;
}

export const EMPTY_VENUE: VenueFormValues = {
  venueName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  mapLink: "",
  capacity: "",
};

export type VenueFieldErrors = Partial<Record<keyof VenueFormValues, string>>;

/**
 * Only the name is genuinely required — a venue can be added before its
 * address is known, and refusing to save one without a postal code is the kind
 * of validation that exists for the database's benefit rather than the user's.
 */
export function validateVenue(values: VenueFormValues): VenueFieldErrors {
  const errors: VenueFieldErrors = {};

  if (!values.venueName.trim()) {
    errors.venueName = "Give the venue a name";
  }
  if (values.capacity.trim()) {
    const capacity = Number(values.capacity);
    if (!Number.isInteger(capacity) || capacity < 0) {
      errors.capacity = "Capacity must be a whole number";
    }
  }
  if (values.mapLink.trim() && !/^https?:\/\//i.test(values.mapLink.trim())) {
    errors.mapLink = "Paste the full link, starting with https://";
  }

  return errors;
}

/** Drops blanks, so an untouched field is absent rather than an empty string. */
export function toVenuePayload(
  values: VenueFormValues
): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    venueName: values.venueName.trim(),
  };

  const text = (key: keyof VenueFormValues) => {
    const value = values[key].trim();
    if (value) payload[key] = value;
  };

  text("address");
  text("city");
  text("state");
  text("country");
  text("postalCode");
  text("mapLink");

  if (values.capacity.trim()) payload.capacity = Number(values.capacity);

  return payload;
}

interface VenueFormProps {
  values: VenueFormValues;
  onChange: (values: VenueFormValues) => void;
  errors: VenueFieldErrors;
}

export function VenueFormFields({ values, onChange, errors }: VenueFormProps) {
  // Built once per mount: Intl.DisplayNames plus a sort on every keystroke is
  // work for no reason.
  const [countries] = useState(countryOptions);

  const set = <K extends keyof VenueFormValues>(
    key: K,
    value: VenueFormValues[K]
  ) => onChange({ ...values, [key]: value });

  const showRegion = hasRegion(values.country);

  return (
    <div className="space-y-4">
      <Field
        id="venueName"
        label="Venue name"
        error={errors.venueName}
        required
      >
        <Input
          id="venueName"
          value={values.venueName}
          onChange={(event) => set("venueName", event.target.value)}
          placeholder="The Lantern Room"
          autoComplete="off"
        />
      </Field>

      <Field id="address" label="Street address" error={errors.address}>
        <Input
          id="address"
          value={values.address}
          onChange={(event) => set("address", event.target.value)}
          placeholder="14 Wharf Road"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="country" label="Country" error={errors.country}>
          <Select
            value={values.country}
            onValueChange={(value) =>
              // Clearing the region on a country change stops a US state code
              // being left behind on a Japanese address.
              onChange({ ...values, country: value, state: "" })
            }
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Choose a country" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="city" label="City" error={errors.city}>
          <Input
            id="city"
            value={values.city}
            onChange={(event) => set("city", event.target.value)}
            placeholder="Bristol"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {showRegion && (
          <Field
            id="state"
            label={regionLabel(values.country)}
            error={errors.state}
          >
            <Input
              id="state"
              value={values.state}
              onChange={(event) => set("state", event.target.value)}
            />
          </Field>
        )}

        <Field
          id="postalCode"
          label={postalLabel(values.country)}
          error={errors.postalCode}
        >
          <Input
            id="postalCode"
            value={values.postalCode}
            onChange={(event) => set("postalCode", event.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="capacity"
          label="Capacity"
          error={errors.capacity}
          hint="How many people fit. Leave blank if it varies."
        >
          <Input
            id="capacity"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.capacity}
            onChange={(event) => set("capacity", event.target.value)}
            placeholder="250"
          />
        </Field>

        <Field
          id="mapLink"
          label="Map link"
          error={errors.mapLink}
          hint="Shown to ticket holders so they can find the door."
        >
          <Input
            id="mapLink"
            type="url"
            value={values.mapLink}
            onChange={(event) => set("mapLink", event.target.value)}
            placeholder="https://maps.app.goo.gl/…"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Submit button with its own pending state, used by both venue forms.
 *
 * `onClick` exists for the event editor, where this sits inside the event's
 * own form — a nested <form> would submit the outer one — so there it is a
 * plain button that calls the handler directly.
 */
export function VenueSubmit({
  saving,
  editing,
  onClick,
}: {
  saving: boolean;
  editing: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={saving}
    >
      {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
      {editing ? "Save venue" : "Add venue"}
    </Button>
  );
}
