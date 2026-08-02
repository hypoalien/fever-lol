"use client";

import { ColumnDef, type Row } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./data-table-column-header";
import { type Attendee } from "@/models/attendees";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useCheckInTicket } from "@/lib/query/hooks";

/**
 * "2 Aug 2026, 04:29" — seconds are noise in a list, and the slash format
 * reads as month-first to some readers and day-first to others.
 */
function whenLabel(value: unknown): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const columns: ColumnDef<Attendee>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Attendee" />
    ),
    // The person comes first: this is a list of people, and the order number
    // was leading it purely because that is the order the API returns fields.
    cell: ({ row }) => (
      <div className="min-w-[140px] font-medium">
        {row.getValue("name") || "Unnamed"}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "eventName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Event" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[220px] truncate">
        {row.getValue("eventName") || "-"}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ticket" />
    ),
    cell: ({ row }) => (
      <div className="max-w-[160px] truncate text-muted-foreground">
        {row.getValue("type")}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    // Status and the time it happened are one fact, so they share a cell.
    // As separate columns the table was wider than any laptop screen and the
    // time scrolled permanently out of view.
    cell: ({ row }) => {
      const checkedIn = row.getValue("status") === "checked_in";
      const at = row.original.checkedInAt;

      return (
        <div className="min-w-[150px]">
          {checkedIn ? (
            <>
              {/* Not the brand accent: that colour is the product's, and a
                  status is not a brand moment. A tick plus quiet ink says
                  "done" without shouting it on every row. */}
              <Badge
                variant="outline"
                className="gap-1 border-success/30 bg-success/10 text-success"
              >
                <Check className="size-3" />
                Checked in
              </Badge>
              {at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {whenLabel(at)}
                </p>
              )}
            </>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not checked in
            </Badge>
          )}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground">
        {row.getValue("orderNumber") || "-"}
      </div>
    ),
    enableSorting: true,
  },
  {
    id: "checkInNow",
    header: () => <span className="sr-only">Check in</span>,
    cell: ({ row }) => <CheckInCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];

const CheckInCell = ({ row }: { row: Row<Attendee> }) => {
  // The same filter the page reads, so the optimistic write lands on the cache
  // entry this table is actually rendering rather than the unfiltered one.
  const eventId = useSearchParams().get("eventId") ?? undefined;
  const checkIn = useCheckInTicket(eventId);

  // The wrapper stays even when there is no button: dropping it collapsed the
  // column and made checked-in rows visibly shorter than the rest.
  if (row.getValue("status") === "checked_in") {
    return <div className="w-[140px]" />;
  }

  return (
    <div className="w-[140px]">
      <Button
        variant="ghost"
        className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
        onClick={() =>
          checkIn.mutate(row.original.code, {
            onSuccess: () => toast.success("Ticket checked in"),
            onError: (error) =>
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Could not check this ticket in"
              ),
          })
        }
        disabled={checkIn.isPending}
      >
        {checkIn.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        {checkIn.isPending ? "Checking in..." : "Check in"}
      </Button>
    </div>
  );
};
