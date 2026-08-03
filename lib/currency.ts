import { isSupportedCurrency } from "@/lib/money";

/** Currency used when an organizer has not chosen one. */
export const DEFAULT_CURRENCY = "USD";

/**
 * Read a currency off a value of unknown shape.
 *
 * The organizer's currency lives on the auth session user, whose type comes
 * from @auth/core. Declaration merging against that package is unreliable here
 * — it resolves through more than one path — so this narrows structurally
 * instead. It also filters out the empty strings present in existing user
 * records, which would otherwise reach Intl.NumberFormat and throw.
 */
export function currencyOf(source: unknown): string | null {
  if (typeof source !== "object" || source === null) return null;
  if (!("currency" in source)) return null;

  const value = (source as { currency?: unknown }).currency;
  return typeof value === "string" && isSupportedCurrency(value) ? value : null;
}

/** As `currencyOf`, but always yields something usable for formatting. */
export function currencyOrDefault(source: unknown): string {
  return currencyOf(source) ?? DEFAULT_CURRENCY;
}
