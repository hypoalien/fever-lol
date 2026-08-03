import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { events, users } from "@/lib/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { log } from "@/lib/log";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fever.lol";

/**
 * Includes every published event and organizer page, so the pages that
 * actually bring in traffic are discoverable rather than only the marketing
 * page being indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  try {
    const [published, organizers] = await Promise.all([
      db
        .select({ id: events.id, updatedAt: events.updatedAt })
        .from(events)
        .where(eq(events.status, "active")),
      db
        .select({ orgUrl: users.orgUrl, updatedAt: users.updatedAt })
        .from(users)
        .where(and(isNotNull(users.orgUrl), isNotNull(users.onboardedAt))),
    ]);

    return [
      ...staticRoutes,
      ...published.map((event) => ({
        url: `${SITE}/events/${event.id}`,
        lastModified: event.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...organizers.map((organizer) => ({
        url: `${SITE}/org/${organizer.orgUrl}`,
        lastModified: organizer.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    // A database hiccup must not take the sitemap down entirely.
    log.exception("Could not build the dynamic sitemap", error, { route: "sitemap.ts" });
    return staticRoutes;
  }
}
