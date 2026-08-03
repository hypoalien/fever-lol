import { readFile, rm } from "node:fs/promises";
import { expect, type Page } from "@playwright/test";

const MAGIC_LINK_FILE = process.env.E2E_MAGIC_LINK_FILE ?? ".e2e/magic-link.txt";

/**
 * Wait for the server to drop the most recent magic link, then return it.
 *
 * The link is written to disk rather than emailed because the suite runs a
 * production build, and the token is stored hashed so it cannot be recovered
 * from the database.
 */
export async function readMagicLink(timeoutMs = 10_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const url = (await readFile(MAGIC_LINK_FILE, "utf8")).trim();
      if (url) return url;
    } catch {
      // Not written yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`No magic link appeared at ${MAGIC_LINK_FILE} within ${timeoutMs}ms`);
}

export async function clearMagicLink(): Promise<void> {
  await rm(MAGIC_LINK_FILE, { force: true });
}

/** Sign in as the seeded organizer and land on the dashboard. */
export async function signIn(page: Page, email = "organizer@fever.local"): Promise<void> {
  await clearMagicLink();

  const response = await page.request.post("/api/auth/sign-in/magic-link", {
    data: { email, callbackURL: "/dashboard" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();

  await page.goto(await readMagicLink());
  await page.waitForURL(/\/dashboard|\/onboarding/);
}

/** The seeded event that is on sale. */
export const SEEDED_EVENT = "Midnight Frequencies";
