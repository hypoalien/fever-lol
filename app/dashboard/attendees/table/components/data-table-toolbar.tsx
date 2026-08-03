"use client";

import { QrCode, X } from "lucide-react";

import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

import { SelectEventFilter } from "@/app/dashboard/attendees/table/components/select-event-filter-attendees";
import { useEffect } from "react";
import { useState } from "react";
import axios from "axios";
import { TicketScanner } from "@/components/ticket-scanner";
interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

interface Event {
  id: string;
  eventName: string;
}
export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await axios.post("/api/events/");
        setEvents(fetchedEvents.data);
      } catch (error) {
        console.error("Failed to fetch events", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const options = events.map((event) => ({
    label: event.eventName,
    value: event.id,
    // label: "",
    // value: "  ",
  }));
  if (loading) {
    return <>Loading</>;
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter attendees..."
          value={
            (table.getColumn("customerName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("customerName")?.setFilterValue(event.target.value)
          }
          className="h-8 w-full sm:w-[250px]"
        />
        <SelectEventFilter title="Select event" options={options} />

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          className="h-8"
          onClick={() => setShowScanner(true)}
        >
          <QrCode className="mr-2 h-4 w-4" />
          Scan Tickets
        </Button>
        <DataTableViewOptions table={table} />

        <TicketScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
        />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
