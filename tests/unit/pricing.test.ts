import { describe, expect, it } from "vitest";

import {
  computeTotals,
  discountFor,
  PricingError,
  resolveCart,
  subtotalOf,
  type EventLike,
} from "@/lib/pricing";

/** An event priced the way the organizer form actually writes it: strings. */
const event: EventLike = {
  status: "active",
  ticketVariants: [
    { type: "General", price: "20", quantity: "100", remaining: "10" },
    { type: "VIP", price: 50.5, quantity: 20, remaining: 2 },
    { type: "Sold out", price: "5", quantity: "5", remaining: 0 },
  ],
};

describe("resolveCart", () => {
  it("prices from the event, ignoring anything the caller thinks a ticket costs", () => {
    const lines = resolveCart(event, [{ type: "General", quantity: 2 }], "USD");
    expect(lines).toEqual([
      { type: "General", quantity: 2, unitPriceMinor: 2000, lineTotalMinor: 4000 },
    ]);
  });

  it("handles numeric and string prices alike", () => {
    const [vip] = resolveCart(event, [{ type: "VIP", quantity: 1 }], "USD");
    expect(vip.unitPriceMinor).toBe(5050);
  });

  it("collapses duplicate lines for the same ticket type", () => {
    const lines = resolveCart(
      event,
      [
        { type: "General", quantity: 3 },
        { type: "General", quantity: 4 },
      ],
      "USD"
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(7);
  });

  it("rejects a quantity that exceeds remaining stock", () => {
    expect(() => resolveCart(event, [{ type: "VIP", quantity: 3 }], "USD")).toThrow(
      /Only 2 "VIP" ticket/
    );
  });

  it("rejects stock exhaustion split across duplicate lines", () => {
    // 2 + 1 exceeds the 2 remaining VIP tickets even though neither line does.
    expect(() =>
      resolveCart(
        event,
        [
          { type: "VIP", quantity: 2 },
          { type: "VIP", quantity: 1 },
        ],
        "USD"
      )
    ).toThrow(/Only 2 "VIP" ticket/);
  });

  it("reports a sold-out variant distinctly", () => {
    expect(() =>
      resolveCart(event, [{ type: "Sold out", quantity: 1 }], "USD")
    ).toThrow(/is sold out/);
  });

  it("rejects unknown ticket types", () => {
    expect(() =>
      resolveCart(event, [{ type: "Backstage", quantity: 1 }], "USD")
    ).toThrow(/Unknown ticket type/);
  });

  it("rejects non-positive and fractional quantities", () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        resolveCart(event, [{ type: "General", quantity }], "USD")
      ).toThrow(/Invalid quantity/);
    }
  });

  it("caps the number of tickets in a single order", () => {
    expect(() =>
      resolveCart(
        { ticketVariants: [{ type: "General", price: "1", quantity: "1000" }] },
        [{ type: "General", quantity: 21 }],
        "USD"
      )
    ).toThrow(/limited to 20 tickets/);
  });

  it("refuses an empty cart", () => {
    expect(() => resolveCart(event, [], "USD")).toThrow(/Cart is empty/);
  });

  it("fails loudly rather than selling a malformed price for nothing", () => {
    const broken: EventLike = {
      ticketVariants: [{ type: "Broken", price: "not-a-number", quantity: "5" }],
    };
    try {
      resolveCart(broken, [{ type: "Broken", quantity: 1 }], "USD");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(PricingError);
      expect((error as PricingError).status).toBe(500);
    }
  });

  it("falls back to quantity when an older event has no remaining field", () => {
    const legacy: EventLike = {
      ticketVariants: [{ type: "General", price: "10", quantity: "3" }],
    };
    expect(resolveCart(legacy, [{ type: "General", quantity: 3 }], "USD")).toHaveLength(1);
    expect(() =>
      resolveCart(legacy, [{ type: "General", quantity: 4 }], "USD")
    ).toThrow(/Only 3/);
  });
});

describe("discountFor", () => {
  it("applies a flat discount", () => {
    expect(
      discountFor(10000, { code: "X", discountType: "flat", discountValue: 25 }, "USD")
    ).toBe(2500);
  });

  it("applies a percentage discount", () => {
    expect(
      discountFor(10000, { code: "X", discountType: "percent", discountValue: 10 }, "USD")
    ).toBe(1000);
  });

  it("never discounts more than the subtotal", () => {
    expect(
      discountFor(1000, { code: "X", discountType: "flat", discountValue: 500 }, "USD")
    ).toBe(1000);
  });

  it("does not apply below the minimum order value", () => {
    const promo = {
      code: "X",
      discountType: "flat" as const,
      discountValue: 10,
      minOrderValue: 100,
    };
    expect(discountFor(5000, promo, "USD")).toBe(0);
    expect(discountFor(10000, promo, "USD")).toBe(1000);
  });

  it("is a no-op without a promo", () => {
    expect(discountFor(5000, null, "USD")).toBe(0);
  });
});

describe("computeTotals", () => {
  const lines = resolveCart(event, [{ type: "General", quantity: 2 }], "USD");

  it("adds fees the buyer bears on top of the subtotal", () => {
    const totals = computeTotals(lines, {
      currency: "USD",
      gatewayFeeBearer: "user",
    });
    expect(totals.subtotalMinor).toBe(4000);
    expect(totals.gatewayFeeMinor).toBe(120);
    expect(totals.totalMinor).toBe(4120);
    expect(totals.payoutMinor).toBe(4000);
  });

  it("deducts fees the organizer bears from the payout instead", () => {
    const totals = computeTotals(lines, {
      currency: "USD",
      gatewayFeeBearer: "organizer",
    });
    // The old client added the gateway fee to the buyer regardless of setting.
    expect(totals.totalMinor).toBe(4000);
    expect(totals.payoutMinor).toBe(3880);
  });

  it("charges fees on the discounted amount, not the gross", () => {
    const totals = computeTotals(lines, {
      currency: "USD",
      promo: { code: "HALF", discountType: "percent", discountValue: 50 },
    });
    expect(totals.discountMinor).toBe(2000);
    expect(totals.netMinor).toBe(2000);
    expect(totals.gatewayFeeMinor).toBe(60);
    expect(totals.totalMinor).toBe(2060);
  });

  it("never produces a negative total from an oversized discount", () => {
    const totals = computeTotals(lines, {
      currency: "USD",
      promo: { code: "FREE", discountType: "flat", discountValue: 9999 },
    });
    expect(totals.netMinor).toBe(0);
    expect(totals.totalMinor).toBe(0);
    expect(totals.payoutMinor).toBe(0);
  });

  it("keeps every figure an integer number of minor units", () => {
    const totals = computeTotals(
      resolveCart(event, [{ type: "VIP", quantity: 2 }], "USD"),
      { currency: "USD" }
    );
    for (const value of Object.values(totals)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe("subtotalOf", () => {
  it("sums line totals", () => {
    expect(
      subtotalOf(resolveCart(event, [
        { type: "General", quantity: 2 },
        { type: "VIP", quantity: 1 },
      ], "USD"))
    ).toBe(4000 + 5050);
  });
});
