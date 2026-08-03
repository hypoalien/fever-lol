import { PageHeader, PageShell } from "@/components/dashboard/page-shell";
import EventsComponent from "@/components/all-events";

export default function EventsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Events"
        description="Everything you are running. Drafts stay private until you publish them."
      />
      <EventsComponent />
    </PageShell>
  );
}
