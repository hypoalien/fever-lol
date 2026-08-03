"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { orderStatuses, paymentStatuses } from "../data/data";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableRowActions } from "./data-table-row-actions";
import { type Order } from "@/models/orders";
import { usePrice } from "@/hooks/use-price";
const PriceCell = ({ value }: { value: number }) => {
  const { currency } = usePrice();
  return (
    <div className="w-[120px]">
      <span className="font-medium text-primary">
        {currency === "USD" ? "$" : "₹"}
        {value}
      </span>
    </div>
  );
};

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
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px] font-medium text-foreground text-nowrap truncate">
        {row.getValue("orderNumber")}
      </div>
    ),
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order Date" />
    ),
    cell: ({ row }) => (
      <div className="w-[160px] text-muted-foreground">
        {new Date(row.getValue("createdAt")).toLocaleString()}
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
      <div className="w-[180px]">
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
      <DataTableColumnHeader column={column} title="Event Name" />
    ),
    cell: ({ row }) => (
      <div className="w-[200px]">
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
      <DataTableColumnHeader column={column} title="Total Amount" />
    ),
    cell: ({ row }) => <PriceCell value={row.getValue("totalMinor")} />,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: "paymentStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Status" />
    ),
    cell: ({ row }) => {
      const status = paymentStatuses.find(
        (status) => status.value === row.getValue("paymentStatus")
      );

      if (!status) return null;

      return (
        <div className="w-[140px] flex items-center">
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
      <DataTableColumnHeader column={column} title="Order Status" />
    ),
    cell: ({ row }) => {
      const status = orderStatuses.find(
        (status) => status.value === row.getValue("orderStatus")
      );

      if (!status) return null;

      return (
        <div className="w-[140px] flex items-center">
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
      <div className="w-[80px]">
        <DataTableRowActions row={row} />
      </div>
    ),
  },
];
