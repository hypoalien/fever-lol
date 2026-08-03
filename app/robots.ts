import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fever.lol";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The dashboard and checkout are per-user and behind auth; indexing
        // them wastes crawl budget and risks surfacing order URLs.
        disallow: ["/api/", "/dashboard/", "/checkout/", "/onboarding", "/ingest/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
