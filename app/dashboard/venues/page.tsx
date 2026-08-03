import { PageHeader, PageShell } from "@/components/dashboard/page-shell";
import { VenuesTable } from "@/components/venue-details-table";

export default function VenuesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Venues"
        description="The places you run events. Add one here and pick it when you create an event."
      />
      <VenuesTable />
    </PageShell>
  );
}
