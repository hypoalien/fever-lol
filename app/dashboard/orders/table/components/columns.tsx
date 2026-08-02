"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { orderStatuses, paymentStatuses } from "../data/data";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { type Order } from "@/models/orders";
import { usePrice } from "@/hooks/use-price";
/**
 * Renders an amount held in minor units.
 *
 * The row carries integers — 29510 is $295.10 — so this both divides and
 * formats. Printing the raw value put a hundredfold error on every row.
 */
const PriceCell = ({ value }: { value: number }) => {
  const { currency } = usePrice();
  return (
    <div className="w-[120px]">
      <span className="font-medium tabular-nums">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
        }).format(value / 100)}
      </span>
    </div>
  );
};

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

export const columns: ColumnDef<Order>[] = [
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
        className="translate-y-[2px] border-primary"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] border-primary"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "orderNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap font-mono text-xs text-muted-foreground">
        {row.getValue("orderNumber")}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Placed" />
    ),
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-muted-foreground">
        {whenLabel(row.getValue("createdAt"))}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[130px] font-medium">
        <span className="font-medium text-foreground">
          {row.getValue("customerName") || "N/A"}
        </span>
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
      <div className="max-w-[200px] truncate">
        <span className="font-medium text-foreground">
          {row.getValue("eventName")}
        </span>
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },

  {
    accessorKey: "totalMinor",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total" />
    ),
    cell: ({ row }) => <PriceCell value={row.getValue("totalMinor")} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "paymentStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment" />
    ),
    cell: ({ row }) => {
      const status = paymentStatuses.find(
        (status) => status.value === row.getValue("paymentStatus")
      );

      if (!status) return null;

      return (
        <div className="flex items-center whitespace-nowrap">
          {status.icon && <status.icon className="mr-2 h-4 w-4 text-primary" />}
          <span className="text-muted-foreground">{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "orderStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = orderStatuses.find(
        (status) => status.value === row.getValue("orderStatus")
      );

      if (!status) return null;

      return (
        <div className="flex items-center whitespace-nowrap">
          {status.icon && <status.icon className="mr-2 h-4 w-4 text-primary" />}
          <span className="text-muted-foreground">{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div>
        <DataTableRowActions row={row} />
      </div>
    ),
  },
];
