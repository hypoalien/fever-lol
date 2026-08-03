"use client";

import { useState } from "react";
import { QrCode, X } from "lucide-react";
import type { Table } from "@tanstack/react-table";

import { SelectEventFilter } from "@/app/dashboard/attendees/table/components/select-event-filter-attendees";
import { TicketScanner } from "@/components/ticket-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvents } from "@/lib/query/hooks";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [showScanner, setShowScanner] = useState(false);

  // From the shared cache rather than its own fetch, so the filter is already
  // populated if the organizer has been on the events page.
  const { data: events } = useEvents();

  const options = (events ?? []).map((event) => ({
    label: event.eventName ?? "Untitled event",
    value: event.id,
  }));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search by name"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-full sm:w-[250px]"
        />
        <SelectEventFilter title="Event" options={options} />

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 size-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button className="h-8" onClick={() => setShowScanner(true)}>
          <QrCode className="mr-2 size-4" />
          Scan tickets
        </Button>
        {/* One view-options menu. This was rendered twice, so the toolbar
            carried two identical "View" buttons. */}
        <DataTableViewOptions table={table} />
      </div>

      <TicketScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}
