"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";

import { CardContent } from "@/components/ui/card";
import { AttendeesResponseSchema, type Attendee } from "@/models/attendees";
import { DataTable } from "./table/components/data-table";
import { columns } from "./table/components/columns";

export default function AttendeesPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [isLoading, setIsLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    axios
      .post("/api/attendees", eventId ? { eventId } : {})
      .then((response) => {
        if (cancelled) return;
        // Validated rather than trusted: a drift between this and the query
        // used to surface as a silently empty table.
        const parsed = AttendeesResponseSchema.safeParse(response.data);
        if (!parsed.success) {
          console.error("Unexpected attendees payload", parsed.error.issues);
          setError("Could not read the attendee list.");
          return;
        }
        setAttendees(parsed.data.attendees);
        setError(null);
      })
      .catch((requestError) => {
        if (cancelled) return;
        console.error("Error fetching attendees:", requestError);
        setError("Could not load attendees.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto p-4">
        <CardContent className="p-0">
          {error ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {error}
            </p>
          ) : (
            <DataTable
              data={attendees}
              columns={columns}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </div>
    </main>
  );
}
