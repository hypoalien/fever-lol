import { describe, expect, it } from "vitest";

import {
  clampToZero,
  formatMinor,
  isSupportedCurrency,
  percentOf,
  toMajor,
  toMinor,
} from "@/lib/money";

describe("toMinor", () => {
  it("converts major units to integer minor units", () => {
    expect(toMinor(10, "USD")).toBe(1000);
    expect(toMinor("10", "USD")).toBe(1000);
    expect(toMinor(0, "INR")).toBe(0);
  });

  it("survives binary floating point that plain multiplication does not", () => {
    // 19.99 * 100 === 1998.9999999999998 in IEEE-754.
    expect(toMinor(19.99, "USD")).toBe(1999);
    expect(toMinor(1.005, "USD")).toBe(101);
    expect(toMinor("0.07", "USD")).toBe(7);
  });

  it("accepts the string prices the event form writes", () => {
    expect(toMinor(" 25.50 ", "INR")).toBe(2550);
  });

  it("rejects anything that is not a usable amount", () => {
    expect(() => toMinor("abc", "USD")).toThrow(/Invalid monetary amount/);
    expect(() => toMinor("", "USD")).toThrow(/Invalid monetary amount/);
    expect(() => toMinor(Number.NaN, "USD")).toThrow(/Invalid monetary amount/);
    expect(() => toMinor(Infinity, "USD")).toThrow(/Invalid monetary amount/);
    expect(() => toMinor(-1, "USD")).toThrow(/cannot be negative/);
  });

  it("rejects unsupported currencies rather than guessing an exponent", () => {
    expect(() => toMinor(1, "XYZ")).toThrow(/Unsupported currency/);
    expect(isSupportedCurrency("XYZ")).toBe(false);
    expect(isSupportedCurrency("INR")).toBe(true);
  });
});

describe("toMajor / formatMinor", () => {
  it("round-trips through minor units", () => {
    expect(toMajor(toMinor(1234.56, "USD"), "USD")).toBe(1234.56);
  });

  it("formats for display", () => {
    expect(formatMinor(129900, "INR")).toContain("1,299.00");
    expect(formatMinor(500, "USD")).toBe("$5.00");
  });
});

describe("percentOf", () => {
  it("rounds to the nearest minor unit", () => {
    expect(percentOf(1000, 3)).toBe(30);
    // 3% of 333 paise is 9.99 -> 10.
    expect(percentOf(333, 3)).toBe(10);
    expect(percentOf(0, 3)).toBe(0);
  });

  it("rejects a negative percentage", () => {
    expect(() => percentOf(100, -1)).toThrow(/Invalid percentage/);
  });
});

describe("clampToZero", () => {
  it("floors negatives at zero", () => {
    expect(clampToZero(-5)).toBe(0);
    expect(clampToZero(5)).toBe(5);
  });
});

describe("zero-decimal currencies", () => {
  it("does not scale JPY, which has no minor unit", () => {
    // ¥1000 is 1000 minor units. Treating it like USD would bill ¥100,000.
    expect(toMinor(1000, "JPY")).toBe(1000);
    expect(toMinor("1000", "JPY")).toBe(1000);
    expect(toMajor(1000, "JPY")).toBe(1000);
  });

  it("rounds a fractional JPY amount to a whole yen", () => {
    expect(toMinor("1000.6", "JPY")).toBe(1001);
  });

  it("handles KRW the same way", () => {
    expect(toMinor(50_000, "KRW")).toBe(50_000);
  });

  it("still scales two-decimal currencies", () => {
    expect(toMinor(10, "USD")).toBe(1000);
    expect(toMinor(10, "BRL")).toBe(1000);
    expect(toMinor(10, "CAD")).toBe(1000);
  });

  it("computes a percentage against the right base", () => {
    // 3% of ¥10,000 is ¥300, not ¥3.
    expect(percentOf(toMinor(10_000, "JPY"), 3)).toBe(300);
  });
});
