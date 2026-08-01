// app/org/[slug]/page.tsx
import { EventsList } from "@/components/events-list";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function OrganizationPage(props: PageProps) {
  const params = await props.params;
  const { slug } = params;
  console.log("slug", slug);
  if (!slug) {
    notFound();
  }

  return <EventsList slug={slug} />;
}
