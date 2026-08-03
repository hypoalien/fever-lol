/**
 * Money is represented as an integer number of minor units (paise, cents).
 *
 * Every price in this codebase used to be a float, which meant `subtotal * 0.03`
 * and `amount * 100` could drift by a paise and produce a Razorpay amount that
 * disagreed with the order we stored. Keep money integral end-to-end and only
 * convert to a decimal at the display boundary.
 */

/** Currencies we support, with the exponent used to reach minor units. */
const CURRENCY_EXPONENT: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_EXPONENT);

export function isSupportedCurrency(currency: string): boolean {
  return currency in CURRENCY_EXPONENT;
}

function exponentFor(currency: string): number {
  const exp = CURRENCY_EXPONENT[currency];
  if (exp === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return exp;
}

/**
 * Parse a major-unit amount (what organizers type into the event form, stored
 * historically as either a string or a number) into minor units.
 *
 * Throws on anything that isn't a finite, non-negative amount so that a corrupt
 * ticket price surfaces as a 4xx rather than silently becoming NaN or 0.
 */
export function toMinor(amount: string | number, currency: string): number {
  const exp = exponentFor(currency);

  if (typeof amount === "string") {
    const text = amount.trim();
    // An empty price is a data error, not zero. Selling a ticket for nothing
    // because a field was left blank is exactly the failure to avoid here.
    if (text === "") {
      throw new Error("Invalid monetary amount: empty string");
    }
    if (!/^\d+(\.\d+)?$/.test(text)) {
      if (/^-/.test(text)) {
        throw new Error(`Monetary amount cannot be negative: ${text}`);
      }
      throw new Error(`Invalid monetary amount: ${JSON.stringify(amount)}`);
    }
    return shiftDecimal(text, exp);
  }

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    throw new Error(`Invalid monetary amount: ${JSON.stringify(amount)}`);
  }
  if (amount < 0) {
    throw new Error(`Monetary amount cannot be negative: ${amount}`);
  }

  // `amount * 100` is unsafe: 19.99 * 100 is 1998.9999999999998 and
  // 1.005 * 100 is 100.49999999999999, which would round down to 100.
  // Normalising through toFixed first collapses that representation error.
  const minor = Math.round(Number((amount * 10 ** exp).toFixed(4)));
  if (!Number.isSafeInteger(minor)) {
    throw new Error(`Monetary amount out of range: ${amount}`);
  }
  return minor;
}

/**
 * Shift a decimal string by `exp` places without ever creating a float.
 * "1.005" with exp 2 becomes 101 (half-up on the dropped digits).
 */
function shiftDecimal(text: string, exp: number): number {
  const [whole, fraction = ""] = text.split(".");
  const padded = fraction.padEnd(exp, "0");
  const kept = padded.slice(0, exp);
  const dropped = padded.slice(exp);

  let minor = Number(whole + kept);
  // Round half-up on whatever precision the organizer typed beyond the
  // currency's exponent.
  if (dropped && Number(dropped[0]) >= 5) minor += 1;

  if (!Number.isSafeInteger(minor)) {
    throw new Error(`Monetary amount out of range: ${text}`);
  }
  return minor;
}

/** Convert minor units back to a major-unit number, for display only. */
export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** exponentFor(currency);
}

/** Format minor units for humans, e.g. 129900 INR -> "₹1,299.00". */
export function formatMinor(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(toMajor(minor, currency));
}

/**
 * Apply a percentage to a minor-unit amount, rounding half-up to the nearest
 * minor unit. `percent` is expressed as a whole number (3 means 3%).
 */
export function percentOf(minor: number, percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error(`Invalid percentage: ${percent}`);
  }
  return Math.round((minor * percent) / 100);
}

/** Clamp to a floor of zero — discounts must never make a total negative. */
export function clampToZero(minor: number): number {
  return minor < 0 ? 0 : minor;
}
