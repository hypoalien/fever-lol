"use client";

import { useSearchParams } from "next/navigation";

import {
  LoadError,
  PageHeader,
  PageShell,
} from "@/components/dashboard/page-shell";
import { FadeIn } from "@/components/ui/motion";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useAttendees } from "@/lib/query/hooks";
import { DataTable } from "./table/components/data-table";
import { columns } from "./table/components/columns";

export default function AttendeesPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? undefined;
  const { data, isPending, isError, refetch } = useAttendees(eventId);

  return (
    <PageShell>
      <PageHeader
        title="Attendees"
        description="Everyone holding a ticket. Check them in from here on the door."
      />

      {isError ? (
        <LoadError
          title="Could not load attendees"
          onRetry={() => void refetch()}
        />
      ) : isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : (
        <FadeIn>
          <DataTable data={data} columns={columns} isLoading={false} />
        </FadeIn>
      )}
    </PageShell>
  );
}
