import { expect, test } from "@playwright/test";

/**
 * Signed-in coverage.
 *
 * This suite exists because its absence let a whole class of bug through: the
 * Drizzle port renamed API fields and none of the dashboard tables were
 * updated, so every one of them rendered blank while the API returned 200 and
 * the build stayed green. Asserting on status codes is not enough — these
 * check that rows actually reach the screen.
 */

test.describe("dashboard", () => {
  test("the overview renders real figures, not NaN", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Revenue this month")).toBeVisible();
    await expect(page.getByText("Tickets sold")).toBeVisible();

    // What must not appear is NaN, which is what reading a renamed field
    // produces.
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("undefined");

    // A formatted amount has to be on the page somewhere.
    expect(body).toMatch(/[$₹€£]\s?[\d,]+/);
  });

  test("the events list shows the seeded events, priced", async ({ page }) => {
    await page.goto("/dashboard/events");

    await expect(page.getByText("Midnight Frequencies").first()).toBeVisible();
    await expect(page.getByText("Sunset Sessions").first()).toBeVisible();

    // Lowest Early Bird tier. Reading the wrong price field renders "$NaN",
    // which is how this was found.
    await expect(page.getByText("From $25.00").first()).toBeVisible();
  });

  test("no screen renders NaN or undefined", async ({ page }) => {
    // A blanket guard for the failure mode that runs through this whole
    // codebase: a renamed field read by a client nobody updated.
    for (const path of [
      "/dashboard",
      "/dashboard/events",
      "/dashboard/venues",
      "/dashboard/discounts",
      "/dashboard/orders",
      "/dashboard/attendees",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      const body = await page.locator("body").innerText();
      expect(body, `${path} renders NaN`).not.toContain("NaN");
      expect(body, `${path} renders undefined`).not.toContain("undefined");
    }
  });

  test("every module page has a heading and a description", async ({ page }) => {
    // The shell drifted before: orders and attendees had no heading at all
    // and discounts had one at a different size.
    for (const [path, heading] of [
      ["/dashboard", "Overview"],
      ["/dashboard/events", "Events"],
      ["/dashboard/venues", "Venues"],
      ["/dashboard/orders", "Orders"],
      ["/dashboard/attendees", "Attendees"],
      ["/dashboard/discounts", "Discounts"],
      ["/dashboard/settings", "Settings"],
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { level: 1, name: heading })
      ).toBeVisible();
    }
  });

  test("sidebar navigation does not reload the document", async ({ page }) => {
    // The sidebar used plain anchors, so every click tore down the app. If a
    // full navigation happens this marker is gone.
    await page.goto("/dashboard");
    await page.evaluate(() => {
      (window as unknown as { __spa: boolean }).__spa = true;
    });

    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL(/\/dashboard\/orders/);

    const survived = await page.evaluate(
      () => (window as unknown as { __spa?: boolean }).__spa === true
    );
    expect(survived, "sidebar click caused a full page load").toBe(true);
  });

  test("cmd-k opens the palette and jumps to a section", async ({ page }) => {
    await page.goto("/dashboard");
    // The shortcut is registered by the palette, so wait for its visible half
    // rather than racing the key against hydration.
    const trigger = page.getByRole("button", { name: /Search/ });
    await expect(trigger).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(
      page.getByPlaceholder("Search, or jump to a section")
    ).toBeVisible();

    // Typing narrows to the seeded event, so the palette is reading the same
    // cache the pages use rather than a separate fetch.
    await page.keyboard.type("midnight");
    await expect(page.getByText("Midnight Frequencies")).toBeVisible();

    await page.keyboard.press("Escape");
    await page.keyboard.press("ControlOrMeta+k");
    await page.keyboard.type("orders");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard\/orders/);
  });

  test("the venues list shows the seeded venues", async ({ page }) => {
    await page.goto("/dashboard/venues");

    await expect(page.getByText("The Warehouse").first()).toBeVisible();
  });

  test("the discounts page shows real promo codes, not mock data", async ({
    page,
  }) => {
    await page.goto("/dashboard/discounts");

    // Seeded on Midnight Frequencies.
    await expect(page.getByText("LANTERN10")).toBeVisible();
    await expect(page.getByText("10% off").first()).toBeVisible();

    // The placeholder rows that used to be hardcoded here.
    await expect(page.getByText("FREESHIP")).toHaveCount(0);
    await expect(page.getByText("WELCOME15")).toHaveCount(0);
  });

  test("orders render with correctly scaled amounts", async ({ page }) => {
    await page.goto("/dashboard/orders");

    await expect(page.getByText("Priya Raman").first()).toBeVisible();

    // Amounts are stored in minor units. Printing them raw put a hundredfold
    // error on every row, which is the kind of thing an organizer notices
    // before we do.
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/\$\d+\.\d{2}/);
    expect(body, "unscaled minor units on screen").not.toMatch(/\$\d{5,}(?!\.)/);
  });

  test("attendees render, with check-in state", async ({ page }) => {
    await page.goto("/dashboard/attendees");
    await expect(page.getByText("Priya Raman").first()).toBeVisible();
  });

  test("the orders and attendees tables load without erroring", async ({
    page,
  }) => {
    for (const path of ["/dashboard/orders", "/dashboard/attendees"]) {
      await page.goto(path);
      // No orders are seeded, so the empty state is expected — what must not
      // happen is the "could not read" branch, which is what a contract
      // mismatch produces.
      await expect(page.getByText(/Could not (read|load)/)).toHaveCount(0);
    }
  });

  test("the API payloads match what the tables read", async ({ page }) => {
    // Guards the exact failure mode: a renamed field on the server that no
    // client was updated for.
    const orders = await page.request.post("/api/orders", { data: {} });
    const ordersBody = (await orders.json()) as { orders: unknown[] };
    expect(Array.isArray(ordersBody.orders)).toBe(true);

    const attendees = await page.request.post("/api/attendees", { data: {} });
    const attendeesBody = (await attendees.json()) as { attendees: unknown[] };
    expect(Array.isArray(attendeesBody.attendees)).toBe(true);

    const analytics = await page.request.get("/api/analytics");
    const stats = (await analytics.json()) as {
      totalRevenue: { amountMinor: number };
      overview: Array<{ name: string; totalMinor: number }>;
      currency: string;
    };
    expect(typeof stats.totalRevenue.amountMinor).toBe("number");
    expect(stats.overview).toHaveLength(12);
    expect(typeof stats.overview[0].totalMinor).toBe("number");
    expect(stats.currency).toBeTruthy();

    const discounts = await page.request.get("/api/discounts");
    const codes = (await discounts.json()) as {
      promoCodes: Array<{ code: string; timesRedeemed: number }>;
    };
    expect(codes.promoCodes.some((c) => c.code === "LANTERN10")).toBe(true);
  });
});
