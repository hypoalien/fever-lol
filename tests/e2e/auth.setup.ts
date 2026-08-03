import { test as setup } from "@playwright/test";

import { signIn } from "./helpers";

export const STORAGE_STATE = "tests/e2e/.auth/organizer.json";

/**
 * Signs in once and saves the session for the dashboard suite to reuse.
 *
 * Signing in per test trips Better Auth's rate limit on the magic-link
 * endpoint — which is the endpoint working correctly, not a bug to route
 * around in the application.
 */
setup("authenticate", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: STORAGE_STATE });
});
