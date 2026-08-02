import { readFile, rm } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

const MAGIC_LINK_FILE = process.env.E2E_MAGIC_LINK_FILE ?? ".e2e/magic-link.txt";

/**
 * Every link this process has already handed out.
 *
 * The server writes the file asynchronously, so a late write from a previous
 * test can land after the next one has cleared it. Comparing timestamps is not
 * enough — a re-write of an already-consumed token looks new. Tracking the
 * content is exact: a link that has been seen before is never returned twice,
 * and following a consumed token (which fails as an unexplained navigation
 * timeout) becomes impossible.
 */
const seen = new Set<string>();

/**
 * Wait for a magic link this process has not used yet.
 *
 * The link goes to a file rather than an inbox because the suite runs a
 * production build, and the token is stored hashed so it cannot be recovered
 * from the database.
 */
export async function readMagicLink(timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const url = (await readFile(MAGIC_LINK_FILE, "utf8")).trim();
      if (url && !seen.has(url)) {
        seen.add(url);
        return url;
      }
    } catch {
      // Not written yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`No unused magic link appeared at ${MAGIC_LINK_FILE}`);
}

export async function clearMagicLink(): Promise<void> {
  await rm(MAGIC_LINK_FILE, { force: true });
}

/** Request a magic link and return it, without following it. */
export async function requestMagicLink(
  page: Page,
  email = "organizer@fever.local"
): Promise<string> {
  const response = await page.request.post("/api/auth/sign-in/magic-link", {
    data: { email, callbackURL: "/dashboard" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  return readMagicLink();
}

/** Sign in as the seeded organizer and land on the dashboard. */
export async function signIn(
  page: Page,
  email = "organizer@fever.local"
): Promise<void> {
  const link = await requestMagicLink(page, email);

  // goto resolves once the redirect has been followed, so the destination can
  // be asserted directly. waitForURL would additionally block on the `load`
  // event, which the dashboard does not reliably reach — it keeps requests
  // open — and that showed up as an unexplained 30s timeout under a full run.
  await page.goto(link, { waitUntil: "domcontentloaded" });
  expect(page.url()).toMatch(/\/dashboard|\/onboarding/);
}

/** The seeded event that is on sale. */
export const SEEDED_EVENT = "Midnight Frequencies";
