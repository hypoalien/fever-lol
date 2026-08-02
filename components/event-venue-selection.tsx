"use client";
import React, { useState, useEffect } from "react";
import { MapPin, Plus, ChevronDown, Building2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import axios from "axios";
interface StateOptions {
  [key: string]: { value: string; label: string }[];
}
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { EventFormSectionProps } from "@/types/event-form";
const stateOptions: StateOptions = {
  US: [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ],
  IN: [
    { value: "AP", label: "Andhra Pradesh" },
    { value: "AR", label: "Arunachal Pradesh" },
    { value: "AS", label: "Assam" },
    { value: "BR", label: "Bihar" },
    { value: "CG", label: "Chhattisgarh" },
    { value: "GA", label: "Goa" },
    { value: "GJ", label: "Gujarat" },
    { value: "HR", label: "Haryana" },
    { value: "HP", label: "Himachal Pradesh" },
    { value: "JH", label: "Jharkhand" },
    { value: "KA", label: "Karnataka" },
    { value: "KL", label: "Kerala" },
    { value: "MP", label: "Madhya Pradesh" },
    { value: "MH", label: "Maharashtra" },
    { value: "MN", label: "Manipur" },
    { value: "ML", label: "Meghalaya" },
    { value: "MZ", label: "Mizoram" },
    { value: "NL", label: "Nagaland" },
    { value: "OD", label: "Odisha" },
    { value: "PB", label: "Punjab" },
    { value: "RJ", label: "Rajasthan" },
    { value: "SK", label: "Sikkim" },
    { value: "TN", label: "Tamil Nadu" },
    { value: "TG", label: "Telangana" },
    { value: "TR", label: "Tripura" },
    { value: "UP", label: "Uttar Pradesh" },
    { value: "UK", label: "Uttarakhand" },
    { value: "WB", label: "West Bengal" },
  ],
};

const timezoneOptions = {
  US: [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  ],
  IN: [{ value: "Asia/Kolkata", label: "India Standard Time (IST)" }],
};
interface Venue {
  id: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  timeZone: string;
  mapsUrl?: string;
}

interface VenueForm {
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  timeZone: string;
  mapsUrl?: string;
}
export function EventVenueSelection({ form }: EventFormSectionProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [isOpenPopover, setIsOpenPopover] = useState(false);

  const defaultVenueForm: VenueForm = {
    venueName: "",
    address: "",
    city: "",
    state: "",
    country: "",
    capacity: 100,
    timeZone: "",
    mapsUrl: "",
  };

  const [venueForm, setVenueForm] = useState<VenueForm>(defaultVenueForm);

  useEffect(() => {
    fetchVenues();
    // Check if there's a venue in form values and it has required fields
    const formVenue = form.getValues("venue");
    if (formVenue?.id || formVenue?.id) {
      setSelectedVenue(formVenue);
    }
  }, []);

  const fetchVenues = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/api/venues");
      setVenues(response.data);
    } catch (error) {
      console.error("Failed to fetch venues:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    form.setValue("venue", {
      id: venue.id,
      venueName: venue.venueName,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      capacity: venue.capacity,
      timeZone: venue.timeZone,
      mapsUrl: venue.mapsUrl,
    });
    setIsOpenPopover(false);
  };

  const handleSaveVenue = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/venues", venueForm);
      const newVenue = response.data;

      // Only update form and UI after successful save
      handleSelectVenue({
        id: newVenue.id.toString(), // Convert MongoDB id to string
        venueName: newVenue.venueName,
        address: newVenue.address,
        city: newVenue.city,
        state: newVenue.state,
        country: newVenue.country,
        capacity: newVenue.capacity,
        timeZone: newVenue.timeZone,
        mapsUrl: newVenue.mapsUrl,
      });

      setVenueForm(defaultVenueForm);
      setIsDrawerOpen(false);
      await fetchVenues(); // Refresh venues list
    } catch (error) {
      console.error("Failed to save venue:", error);
      // Add error handling UI feedback here
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target; // Change from name to id since we're using id in inputs
    setVenueForm((prev) => ({
      ...prev,
      [id]: value,
    }));
  };
  return (
    <FormItem>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Venue Selection
              </CardTitle>
              <CardDescription>
                Choose an existing venue or create a new one for your event
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Popover open={isOpenPopover} onOpenChange={setIsOpenPopover}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-auto w-full my-2"
                  >
                    {selectedVenue ? "Change Venue" : "Select Venue"}
                    <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[300px]" align="end">
                  <Command className="w-full">
                    <CommandInput placeholder="Search venues..." />
                    <CommandList>
                      <CommandEmpty>No venues found.</CommandEmpty>
                      {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <CommandGroup>
                          {venues.map((venue) => (
                            <CommandItem
                              key={venue.id}
                              onSelect={() => handleSelectVenue(venue)}
                              className="teamaspace-y-1 flex flex-col items-start px-4 py-2"
                            >
                              <p>{venue?.venueName}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {venue?.address}
                              </p>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      <CommandGroup className="border-t">
                        <CommandItem
                          onSelect={() => setIsDrawerOpen(true)}
                          className="teamaspace-y-1 flex items-center px-4 py-2 hover:bg-primary/5"
                        >
                          <Plus className="mr-2 h-4 w-4 text-primary" />
                          <p className="text-primary font-medium">
                            Create New Venue
                          </p>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedVenue ? (
                <div className="rounded-lg border p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-xl">
                        {selectedVenue.venueName}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="mr-1 h-4 w-4" />
                        {selectedVenue.address}, {selectedVenue.city},{" "}
                        {selectedVenue.state}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary">
                          Capacity: {selectedVenue.capacity}
                        </Badge>
                        <Badge variant="outline">
                          {selectedVenue.timeZone}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-sm">
                    <a
                      href={selectedVenue.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <MapPin className="h-4 w-4" />
                      View on Maps
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDrawerOpen(true)}
                    >
                      Change Venue
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setIsDrawerOpen(true)}
                  variant="outline"
                  className="w-full py-8 border-dashed"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Venue
                </Button>
              )}
            </CardContent>

            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                  <DrawerHeader>
                    <DrawerTitle>Create New Venue</DrawerTitle>
                    <DrawerDescription>
                      Fill in the venue details below
                    </DrawerDescription>
                  </DrawerHeader>

                  <div className="p-4 pb-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="venueName">Venue Name</Label>
                        <Input
                          id="venueName"
                          name="venueName"
                          placeholder="e.g., Conference Center, Concert Hall"
                          value={venueForm.venueName}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={venueForm?.country}
                          onValueChange={(value) => {
                            setVenueForm({
                              ...venueForm,
                              country: value,
                              state: "",
                              timeZone: "",
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="IN">India</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {venueForm?.country && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="state">State</Label>
                              <Select
                                value={venueForm.state}
                                onValueChange={(value) =>
                                  setVenueForm({ ...venueForm, state: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  {stateOptions[
                                    venueForm.country as keyof typeof stateOptions
                                  ].map((state) => (
                                    <SelectItem
                                      key={state.value}
                                      value={state.value}
                                    >
                                      {state.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="city">City</Label>
                              <Input
                                id="city"
                                name="city"
                                placeholder="Enter city name"
                                value={venueForm.city}
                                onChange={handleInputChange}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="timeZone">Time Zone</Label>
                            <Select
                              value={venueForm.timeZone}
                              onValueChange={(value) =>
                                setVenueForm({ ...venueForm, timeZone: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                              <SelectContent>
                                {timezoneOptions[
                                  venueForm.country as keyof typeof timezoneOptions
                                ].map((timezone) => (
                                  <SelectItem
                                    key={timezone.value}
                                    value={timezone.value}
                                  >
                                    {timezone.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          name="address"
                          placeholder="Enter complete street address"
                          value={venueForm.address}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Venue Capacity</Label>
                        <Slider
                          value={[venueForm?.capacity]}
                          onValueChange={(value) =>
                            setVenueForm({ ...venueForm, capacity: value[0] })
                          }
                          max={10000}
                          step={50}
                          className="py-4"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Current: {venueForm?.capacity} people</span>
                          <span>Max: 10,000</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mapsUrl">Google Maps URL</Label>
                        <Input
                          id="mapsUrl"
                          name="mapsUrl"
                          placeholder="https://maps.google.com/..."
                          value={venueForm.mapsUrl}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <DrawerFooter>
                    <Button onClick={handleSaveVenue} disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isLoading ? "Saving..." : "Save Venue"}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </div>
              </DrawerContent>
            </Drawer>
          </Card>
          <FormMessage />
    </FormItem>
  );
}
