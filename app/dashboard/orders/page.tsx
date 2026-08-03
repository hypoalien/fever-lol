"use client";

import { useSearchParams } from "next/navigation";

import {
  LoadError,
  PageHeader,
  PageShell,
} from "@/components/dashboard/page-shell";
import { FadeIn } from "@/components/ui/motion";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useOrders } from "@/lib/query/hooks";
import { DataTable } from "./table/components/data-table";
import { columns } from "./table/components/columns";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? undefined;
  const { data, isPending, isError, refetch } = useOrders(eventId);

  return (
    <PageShell>
      <PageHeader
        title="Orders"
        description={
          eventId
            ? "Every purchase for this event."
            : "Every purchase across your events, newest first."
        }
      />

      {isError ? (
        <LoadError title="Could not load orders" onRetry={() => void refetch()} />
      ) : isPending ? (
        <TableSkeleton rows={8} columns={5} />
      ) : (
        <FadeIn>
          <DataTable data={data} columns={columns} isLoading={false} />
        </FadeIn>
      )}
    </PageShell>
  );
}
