"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { VenueCard } from "@/components/venue-card";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Search } from "lucide-react";
export interface Venue {
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

export const fetchVenues = async () => {
  try {
    const response = await axios.get<Venue[]>("/api/venues");
    return response.data;
  } catch (error) {
    console.error("Error fetching venues:", error);
    return [];
  }
};

export function VenuesTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchVenues();
        setVenues(data);
      } catch (err) {
        setError("Failed to load venues");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVenues();
  }, []);

  const filteredVenues = venues
    ? venues.filter((venue) => {
        const venueValuesString = Object.values(venue)
          .filter((value) => value !== undefined && value !== null)
          .map((value) => value.toString().toLowerCase())
          .join(" ");
        const matchesSearch = venueValuesString.includes(
          searchQuery.toLowerCase()
        );
        return matchesSearch;
      })
    : [];

  if (error) {
    return (
      <div className="flex justify-center items-center p-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <p>Loading venues...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <Card className="border-border/40 shadow-lg hover:shadow-xl transition-all duration-200">
        <CardHeader className="space-y-4 bg-card/50 rounded-t-lg border-b border-border/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-foreground">
                  Venues Overview
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  {venues.length} {venues.length === 1 ? "venue" : "venues"}{" "}
                  available
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  placeholder="Search venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-[200px] lg:w-[300px] pl-9 border-border/30 focus:border-primary focus:ring-primary/20 bg-background/50 backdrop-blur-sm placeholder:text-muted-foreground/50"
                />
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground/50" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <VenueCard venues={filteredVenues} setVenues={setVenues} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
