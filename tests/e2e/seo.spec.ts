import { expect, test } from "@playwright/test";

/**
 * SEO assertions against the *served HTML*, not the hydrated DOM.
 *
 * The distinction matters: the landing page was previously wrapped in a
 * client-side session gate, so the initial response was an empty shell and a
 * crawler reading raw HTML saw nothing. These tests use `request` rather than
 * `page` so they read exactly what a crawler would.
 */

test.describe("SEO", () => {
  test("the landing page content is in the served HTML", async ({ request }) => {
    const html = await (await request.get("/")).text();

    // Content, not a loading shell.
    expect(html).toContain("Sell tickets");
    expect(html).toContain("Eventbrite");

    // Exactly one h1, and real heading structure below it.
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect((html.match(/<h2[\s>]/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  test("head metadata is complete", async ({ request }) => {
    const html = await (await request.get("/")).text();

    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toMatch(/<meta name="description" content=".{80,}?"/);

    // Placeholder verification tokens must never ship.
    expect(html).not.toContain("your-google-site-verification");
  });

  test("structured data is valid and served without JavaScript", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();

    const match = html.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/s
    );
    expect(match, "no JSON-LD in the served HTML").not.toBeNull();

    const data = JSON.parse(match![1]) as {
      "@graph": Array<{ "@type": string; mainEntity?: unknown[] }>;
    };
    const types = data["@graph"].map((node) => node["@type"]);

    expect(types).toContain("Organization");
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("FAQPage");

    const faq = data["@graph"].find((n) => n["@type"] === "FAQPage");
    expect(faq?.mainEntity?.length).toBeGreaterThanOrEqual(4);
  });

  test("robots.txt points at the sitemap and shields private routes", async ({
    request,
  }) => {
    const body = await (await request.get("/robots.txt")).text();

    expect(body).toContain("Sitemap:");
    for (const path of ["/api/", "/dashboard/", "/checkout/"]) {
      expect(body).toContain(`Disallow: ${path}`);
    }
  });

  test("the sitemap lists published events", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();

    expect(xml).toContain("<urlset");
    // The seed publishes two events, so they must be discoverable.
    expect((xml.match(/\/events\//g) ?? []).length).toBeGreaterThanOrEqual(2);
    // Drafts must not be.
    expect(xml).not.toContain("Winter Warehouse");
  });
});

test.describe("operations", () => {
  test("the health check reports on the database", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      status: string;
      database: string;
      latencyMs: number;
    };
    expect(body.status).toBe("ok");
    expect(body.database).toBe("ok");
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);

    // Must never be cached, or monitoring reads a stale answer.
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("an unknown page renders the custom 404", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("There's nothing here")).toBeVisible();
  });
});
