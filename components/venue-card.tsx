"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Loader2,
  MapPin,
  Edit2,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";
interface Venue {
  id: string;
  venueName: string;
  address: string;
  city: string;
  state: string;
  capacity: number;
  mapsUrl: string;
  status?: string;
  country: string;
  timeZone: string;
  userId: string;
}

interface CreateVenueDto {
  venueName: string;
  address: string;
  city: string;
  state: string;
  capacity: number;
  mapsUrl: string;
  timeZone: string;
  country: string;
}

// Add this interface for state options
interface StateOptions {
  [key: string]: { value: string; label: string }[];
}

// Add state options data
export const stateOptions: StateOptions = {
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

// Add timezone options data
export const timezoneOptions: StateOptions = {
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

export const VenueCard = ({
  venues,
  setVenues,
}: {
  venues: Venue[];
  setVenues: React.Dispatch<React.SetStateAction<Venue[]>>;
}) => {
  const router = useRouter();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingVenueId, setEditingVenueId] = useQueryState("editVenue");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CreateVenueDto>({
    venueName: "",
    address: "",
    city: "",
    state: "",
    capacity: 0,
    mapsUrl: "",
    timeZone: "",
    country: "",
  });

  useEffect(() => {
    if (editingVenueId) {
      const venueToEdit = venues.find((v) => v.id === editingVenueId);
      if (venueToEdit) {
        setFormData({
          venueName: venueToEdit.venueName,
          address: venueToEdit.address,
          city: venueToEdit.city,
          state: venueToEdit.state,
          capacity: venueToEdit.capacity,
          mapsUrl: venueToEdit.mapsUrl,
          timeZone: venueToEdit.timeZone,
          country: venueToEdit.country,
        });
        setIsDialogOpen(true);
      }
    }
  }, [editingVenueId, venues]);

  const pageCount = Math.ceil(venues.length / pageSize);
  const paginatedVenues = venues.slice(
    pageIndex * pageSize,
    Math.min((pageIndex + 1) * pageSize, venues.length)
  );

  useEffect(() => {
    if (pageIndex >= pageCount && pageCount > 0) {
      setPageIndex(pageCount - 1);
    }
  }, [pageCount, pageIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      setPageIndex(newPage);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value =
      e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: value,
    }));
  };

  const handleSelectChange = (field: keyof CreateVenueDto, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const createVenue = async (venueData: CreateVenueDto) => {
    try {
      setIsLoading(true);
      const response = await axios.post<Venue>("/api/venues", venueData);
      return response.data;
    } catch (error) {
      console.error("Error creating venue:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateVenue = async (id: string, venueData: CreateVenueDto) => {
    try {
      setIsLoading(true);
      const response = await axios.put<Venue>(`/api/venues/${id}`, venueData);
      return response.data;
    } catch (error) {
      console.error("Error updating venue:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  const validateForm = (): boolean => {
    if (
      !formData.venueName ||
      !formData.address ||
      !formData.city ||
      !formData.state ||
      !formData.country ||
      !formData.timeZone ||
      formData.capacity <= 0
    ) {
      setFormError("Please fill in all required fields");
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingVenueId) {
        const updatedVenue = await updateVenue(editingVenueId, formData);
        setVenues((prev) =>
          prev.map((venue) =>
            venue.id === editingVenueId ? updatedVenue : venue
          )
        );
      } else {
        const newVenue = await createVenue(formData);
        setVenues((prev) => [...prev, newVenue]);
      }

      setIsDialogOpen(false);
      setEditingVenueId(null);
      setFormData({
        venueName: "",
        address: "",
        city: "",
        state: "",
        capacity: 0,
        mapsUrl: "",
        timeZone: "",
        country: "",
      });
    } catch (error) {
      setFormError("Failed to save venue. Please try again.");
      console.error("Failed to save venue:", error);
    }
  };

  const handleDelete = async (venueId: string) => {
    try {
      await axios.delete(`/api/venues/${venueId}`);
      setVenues((prev) => prev.filter((venue) => venue.id !== venueId));
      if (paginatedVenues.length === 1 && pageIndex > 0) {
        setPageIndex(pageIndex - 1);
      }
    } catch (error) {
      console.error("Failed to delete venue:", error);
      // Show error message to user
    }
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenueId(venue.id);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingVenueId(null);
    setFormData({
      venueName: "",
      address: "",
      city: "",
      state: "",
      capacity: 0,
      mapsUrl: "",
      timeZone: "",
      country: "",
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>Venues</CardTitle>
            <CardDescription>
              Manage your venues and view their details.
            </CardDescription>
          </div>

          <Drawer
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleDialogClose();
              }
            }}
          >
            <DrawerTrigger asChild>
              <Button
                size="sm"
                className="ml-auto gap-1"
                onClick={() => setIsDialogOpen(true)}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add Venue
                </span>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>
                    {editingVenueId ? "Edit Venue" : "Add New Venue"}
                  </DrawerTitle>
                  <DrawerDescription>
                    {editingVenueId
                      ? "Edit venue details below."
                      : "Create a new venue by filling out the details below."}
                  </DrawerDescription>
                </DrawerHeader>

                <form onSubmit={handleSubmit}>
                  {formError && (
                    <p className="text-red-500 text-sm mt-2">{formError}</p>
                  )}

                  <div className="p-4 pb-0">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="venueName">Venue Name</Label>
                        <Input
                          id="venueName"
                          value={formData.venueName}
                          onChange={handleInputChange}
                          placeholder="e.g., Conference Center, Concert Hall"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) =>
                            handleSelectChange("country", value)
                          }
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Select
                            value={formData.state}
                            onValueChange={(value) =>
                              handleSelectChange("state", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {stateOptions[formData.country]?.map((state) => (
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
                            value={formData.city}
                            onChange={handleInputChange}
                            placeholder="City"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Time Zone</Label>
                        <Select
                          value={formData.timeZone}
                          onValueChange={(value) =>
                            handleSelectChange("timeZone", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {timezoneOptions[formData.country]?.map(
                              (timezone) => (
                                <SelectItem
                                  key={timezone.value}
                                  value={timezone.value}
                                >
                                  {timezone.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="123 Main St"
                          required
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Venue Capacity</Label>
                        <Slider
                          onValueChange={(value) =>
                            setFormData({ ...formData, capacity: value[0] })
                          }
                          value={[formData.capacity]}
                          max={10000}
                          step={50}
                          className="py-4"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Current: {formData.capacity} people</span>
                          <span>Max: 10,000</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mapsUrl">Google Maps URL</Label>
                        <Input
                          id="mapsUrl"
                          type="url"
                          value={formData.mapsUrl}
                          onChange={handleInputChange}
                          placeholder="https://maps.google.com/..."
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <DrawerFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isLoading
                        ? "Saving..."
                        : editingVenueId
                        ? "Update Venue"
                        : "Create Venue"}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </form>
              </div>
            </DrawerContent>
          </Drawer>
        </CardHeader>
        <CardContent>
          {venues.length === 0 ? (
            <div className="flex flex-1 pt-32 pb-32 items-center justify-center rounded-lg border border-dashed shadow-sm">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                  You have no Venues
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can start managing venues as soon as you add one.
                </p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Add Venue
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-h-screen overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0">Name</TableHead>
                    <TableHead className="sticky top-0">Address</TableHead>
                    <TableHead className="sticky top-0">City</TableHead>
                    <TableHead className="sticky top-0">State</TableHead>
                    <TableHead className="sticky top-0">Capacity</TableHead>
                    <TableHead className="sticky top-0">
                      <span className="sr-only">Maps Link</span>
                    </TableHead>
                    <TableHead className="sticky top-0">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVenues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell
                        onClick={() => router.push(`/venue/${venue.id}`)}
                        className="font-medium cursor-pointer hover:underline"
                      >
                        {venue.venueName}
                      </TableCell>
                      <TableCell>{venue.address}</TableCell>
                      <TableCell>{venue.city}</TableCell>
                      <TableCell>{venue.state}</TableCell>
                      <TableCell>{venue.capacity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => window.open(venue.mapsUrl, "_blank")}
                          variant={"link"}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          View on Maps
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label="Actions"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(venue)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(venue.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between px-2 w-full">
            <div className="flex-1 text-sm text-muted-foreground">
              {venues.length > 0 ? (
                <>
                  Showing{" "}
                  <strong>
                    {pageIndex * pageSize + 1}-
                    {Math.min((pageIndex + 1) * pageSize, venues.length)}
                  </strong>{" "}
                  of <strong>{venues.length}</strong>
                </>
              ) : null}
            </div>
            {venues.length > 0 && (
              <div className="flex px-4 items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Rows per page</p>
                  <Select
                    value={`${pageSize}`}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPageIndex(0);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 20, 30, 40, 50].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {pageIndex + 1} of {pageCount}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => handlePageChange(0)}
                    disabled={pageIndex === 0}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(pageIndex - 1)}
                    disabled={pageIndex === 0}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => handlePageChange(pageIndex + 1)}
                    disabled={pageIndex >= pageCount - 1}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => handlePageChange(pageCount - 1)}
                    disabled={pageIndex >= pageCount - 1}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
