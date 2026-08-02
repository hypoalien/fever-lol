/**
 * Countries, and what the second-level division is called in each.
 *
 * The three venue forms each carried a hand-written list of US states and
 * Indian states and nothing else, so an organizer in Tokyo, São Paulo or Berlin
 * could not enter an address. Rather than hand-write a subdivision list for
 * every country — which is a data problem, not a UI one — the region is a free
 * text field whose *label* changes, which is the part that actually confuses
 * people filling in a foreign address form.
 *
 * Country names come from Intl.DisplayNames so they are localised by the
 * browser and there is no 250-entry literal to keep in step with the world.
 */

/** ISO 3166-1 alpha-2, ordered by where this platform is actually used. */
export const COUNTRY_CODES = [
  "US", "GB", "CA", "AU", "IN", "JP", "DE", "FR", "ES", "IT", "NL", "IE",
  "BR", "MX", "AR", "CL", "CO", "PT", "BE", "AT", "CH", "SE", "NO", "DK",
  "FI", "PL", "CZ", "GR", "TR", "AE", "SA", "ZA", "NG", "KE", "EG", "IL",
  "SG", "MY", "TH", "ID", "PH", "VN", "KR", "CN", "HK", "TW", "NZ",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

/**
 * What the level below "country" is called locally.
 *
 * Getting this wrong is the difference between a form that reads as written
 * for you and one that reads as written for Americans. Anything not listed
 * falls back to "Region", which is true everywhere and wrong nowhere.
 */
const REGION_LABELS: Partial<Record<CountryCode, string>> = {
  US: "State",
  AU: "State",
  BR: "State",
  IN: "State",
  MX: "State",
  NG: "State",
  MY: "State",
  CA: "Province",
  CN: "Province",
  ZA: "Province",
  AR: "Province",
  ID: "Province",
  NL: "Province",
  BE: "Province",
  PH: "Province",
  JP: "Prefecture",
  GB: "County",
  IE: "County",
  KE: "County",
  DE: "State",
  AT: "State",
  CH: "Canton",
  FR: "Department",
  IT: "Province",
  ES: "Province",
  TH: "Province",
  VN: "Province",
  TR: "Province",
  KR: "Province",
  SE: "County",
  NO: "County",
  FI: "Region",
  PL: "Voivodeship",
};

/** What a postal code is called, where the local word is not "Postal code". */
const POSTAL_LABELS: Partial<Record<CountryCode, string>> = {
  US: "ZIP code",
  GB: "Postcode",
  AU: "Postcode",
  IN: "PIN code",
  IE: "Eircode",
  NZ: "Postcode",
};

/**
 * Countries where a second-level division is not part of a normal address.
 * Asking for one produces an empty field on every venue.
 */
const NO_REGION = new Set<string>([
  "SG", "HK", "AE", "IL", "GR", "PT", "DK", "CZ",
]);

export function countryName(code: string): string {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

export function regionLabel(code: string | undefined): string {
  if (!code) return "Region";
  return REGION_LABELS[code as CountryCode] ?? "Region";
}

export function hasRegion(code: string | undefined): boolean {
  return !code || !NO_REGION.has(code);
}

export function postalLabel(code: string | undefined): string {
  if (!code) return "Postal code";
  return POSTAL_LABELS[code as CountryCode] ?? "Postal code";
}

/** Country options, sorted by localised name so the list reads alphabetically. */
export function countryOptions(): Array<{ value: string; label: string }> {
  return COUNTRY_CODES.map((value) => ({ value, label: countryName(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
