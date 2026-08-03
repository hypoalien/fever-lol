"use client";

import { ColumnDef, type Row } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "./data-table-column-header";
import { AttendeeInfo } from "@/models/attendees";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";

export const columns: ColumnDef<AttendeeInfo>[] = [
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
        className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "orderId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px] font-medium text-muted-foreground text-nowrap truncate">
        {row.getValue("orderId") || "N/A"}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "eventName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Event Name" />
    ),
    cell: ({ row }) => (
      <div className="w-[250px] truncate font-medium">
        {row.getValue("eventName") || "N/A"}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer Name" />
    ),
    cell: ({ row }) => (
      <div className="w-[180px] truncate font-medium">
        {row.getValue("customerName") || "N/A"}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "ticketType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ticket Type" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px] truncate font-medium text-muted-foreground">
        {row.getValue("ticketType")}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "checkedIn",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px]">
        {row.getValue("checkedIn") ? (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
            Checked in
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-muted text-muted-foreground"
          >
            Not checked in
          </Badge>
        )}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "checkInNow",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => <CheckInCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "checkedInTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Checked In Time" />
    ),
    cell: ({ row }) => (
      <div className="w-[180px] text-muted-foreground">
        {row.getValue("checkedInTime")
          ? new Date(row.getValue("checkedInTime")).toLocaleString()
          : "-"}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
];

const CheckInCell = ({ row }: { row: Row<AttendeeInfo> }) => {
  const [isLoading, setIsLoading] = useState(false);
  // Held locally rather than written onto row.original: mutating the table's
  // data does not notify it, so the cell only re-rendered by luck of the
  // loading flag changing in the same tick.
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/tickets/validate/single-ticket", {
        ticketId: row.original.attendeeId,
      });
      if (response.data.success) {
        setJustCheckedIn(true);
        toast.success("Ticket checked in");
      } else {
        toast.error(response.data.message ?? "Could not check this ticket in");
      }
    } catch (error) {
      console.error("Check-in failed:", error);
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[140px]">
      {!justCheckedIn && !row.getValue("checkedIn") && (
        <Button
          variant="ghost"
          className="hover:bg-primary/10 hover:text-primary px-2 h-8"
          onClick={handleCheckIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Checking in..." : "Check in"}
        </Button>
      )}
    </div>
  );
};
