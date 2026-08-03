"use client";

import { XIcon } from "lucide-react";

import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";

import { orderStatuses, paymentStatuses } from "../data/data";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";
import { SelectEventFilter } from "./select-event-filter";
import { useEffect, useState } from "react";
import axios from "axios";

interface Event {
  id: string;
  eventName: string;
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const fetchedEvents = await axios.post("/api/events/");
        setEvents(fetchedEvents.data.reverse());
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
  }));
  if (loading) {
    return <>Loading</>;
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search orders by customer..."
          value={
            (table.getColumn("customerName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("customerName")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn("paymentStatus") && (
          <DataTableFacetedFilter
            column={table.getColumn("paymentStatus")}
            title="Payment Status"
            options={paymentStatuses}
          />
        )}
        {table.getColumn("orderStatus") && (
          <DataTableFacetedFilter
            column={table.getColumn("orderStatus")}
            title="Order Status"
            options={orderStatuses}
          />
        )}

        <SelectEventFilter title="Select event" options={options} />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <XIcon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
