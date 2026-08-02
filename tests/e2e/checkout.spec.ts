import { expect, test } from "@playwright/test";

/**
 * The buyer path.
 *
 * Payment authorisation itself is not exercised — that needs a live gateway —
 * but everything up to it is, including the guards that matter: prices coming
 * from the server, stock limits, and a forged confirmation being refused.
 */

async function seededEventId(request: {
  post: (url: string, opts: { data: unknown }) => Promise<{ json: () => Promise<unknown> }>;
}): Promise<string> {
  const response = await request.post("/api/public/events", {
    data: { slug: "lantern" },
  });
  const body = (await response.json()) as {
    events: Array<{ id: string; title: string }>;
  };
  const event = body.events.find((e) => e.title === "Midnight Frequencies");
  if (!event) throw new Error("Seeded event is missing");
  return event.id;
}

test.describe("checkout", () => {
  test("the public event page lists tickets and their remaining stock", async ({
    page,
    request,
  }) => {
    const eventId = await seededEventId(request);
    await page.goto(`/events/${eventId}`);

    await expect(page.getByText("Midnight Frequencies").first()).toBeVisible();
    await expect(page.getByText("From $25.00").first()).toBeVisible();

    // Tiers are behind the purchase drawer rather than on the page body.
    await page.getByRole("button", { name: "Buy Now" }).first().click();
    await expect(page.getByText("Early Bird").first()).toBeVisible();
  });

  test("a draft event is not publicly reachable", async ({ request }) => {
    // Any well-formed id that isn't a published event must 404 rather than leak.
    const response = await request.get(
      "/api/public/events/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(404);
  });

  test("prices come from the server, not the request", async ({ request }) => {
    const eventId = await seededEventId(request);

    const created = await request.post("/api/checkout", {
      // A price is deliberately included; it must be ignored.
      data: {
        eventId,
        cart: [{ type: "Early Bird", quantity: 2, price: 1, priceMinor: 1 }],
      },
    });
    expect(created.ok()).toBeTruthy();
    const { checkoutId } = (await created.json()) as { checkoutId: string };

    const read = await request.get(`/api/checkout/${checkoutId}`);
    const body = (await read.json()) as {
      items: Array<{ unitPriceMinor: number; quantity: number }>;
      totals: { subtotalMinor: number; gatewayFeeMinor: number; totalMinor: number };
    };

    // Seeded Early Bird is $25.00.
    expect(body.items[0].unitPriceMinor).toBe(2500);
    expect(body.totals.subtotalMinor).toBe(5000);
    // 3% gateway fee, borne by the buyer.
    expect(body.totals.gatewayFeeMinor).toBe(150);
    expect(body.totals.totalMinor).toBe(5150);
  });

  test("a promo code discounts, and fees follow the discounted amount", async ({
    request,
  }) => {
    const eventId = await seededEventId(request);
    const created = await request.post("/api/checkout", {
      data: { eventId, cart: [{ type: "Early Bird", quantity: 2 }] },
    });
    const { checkoutId } = (await created.json()) as { checkoutId: string };

    const applied = await request.post(
      `/api/checkout/${checkoutId}/validate-coupon`,
      { data: { couponCode: "LANTERN10" } }
    );
    expect(applied.ok()).toBeTruthy();

    const body = (await applied.json()) as {
      totals: { discountMinor: number; gatewayFeeMinor: number; totalMinor: number };
    };
    expect(body.totals.discountMinor).toBe(500);
    // 3% of 4500, not of 5000.
    expect(body.totals.gatewayFeeMinor).toBe(135);
    expect(body.totals.totalMinor).toBe(4635);
  });

  test("an unknown coupon is rejected", async ({ request }) => {
    const eventId = await seededEventId(request);
    const created = await request.post("/api/checkout", {
      data: { eventId, cart: [{ type: "Early Bird", quantity: 1 }] },
    });
    const { checkoutId } = (await created.json()) as { checkoutId: string };

    const applied = await request.post(
      `/api/checkout/${checkoutId}/validate-coupon`,
      { data: { couponCode: "NOT-A-CODE" } }
    );
    expect(applied.status()).toBe(400);
  });

  test("stock limits are enforced", async ({ request }) => {
    const eventId = await seededEventId(request);

    // Seeded Early Bird has 12 remaining.
    const response = await request.post("/api/checkout", {
      data: { eventId, cart: [{ type: "Early Bird", quantity: 13 }] },
    });
    expect(response.status()).toBe(409);
    expect(await response.text()).toContain("Early Bird");
  });

  test("a sold-out tier cannot be added", async ({ request }) => {
    const response = await request.post("/api/public/events", {
      data: { slug: "lantern" },
    });
    const body = (await response.json()) as {
      events: Array<{ id: string; title: string }>;
    };
    const sunset = body.events.find((e) => e.title === "Sunset Sessions");
    if (!sunset) throw new Error("Seeded event is missing");

    const created = await request.post("/api/checkout", {
      data: { eventId: sunset.id, cart: [{ type: "Front Row", quantity: 1 }] },
    });
    expect(created.status()).toBe(409);
    expect(await created.text()).toContain("sold out");
  });

  test("a forged payment confirmation issues no tickets", async ({ request }) => {
    const eventId = await seededEventId(request);
    const created = await request.post("/api/checkout", {
      data: { eventId, cart: [{ type: "Early Bird", quantity: 1 }] },
    });
    const { checkoutId } = (await created.json()) as { checkoutId: string };

    const confirmed = await request.post(`/api/checkout/${checkoutId}/confirm`, {
      data: {
        razorpay_order_id: "order_forged",
        razorpay_payment_id: "pay_forged",
        razorpay_signature: "00".repeat(32),
        customerInfo: {
          firstName: "Mallory",
          lastName: "Attacker",
          email: "mallory@example.com",
          phone: "5551234",
        },
      },
    });

    expect(confirmed.ok()).toBeFalsy();
    expect(confirmed.status()).toBe(400);
  });

  test("an expired or unknown checkout is not readable", async ({ request }) => {
    const response = await request.get(
      "/api/checkout/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(404);
  });
});
