import { expect, test } from "@playwright/test";

import { clearMagicLink, readMagicLink, signIn } from "./helpers";

test.describe("authentication", () => {
  test("a magic link signs the organizer in", async ({ page }) => {
    await signIn(page);

    const session = await page.request.get("/api/auth/get-session");
    const body = await session.json();
    expect(body?.user?.email).toBe("organizer@fever.local");
  });

  test("protected endpoints refuse an anonymous caller", async ({ request }) => {
    for (const path of ["/api/profile", "/api/analytics"]) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be 401`).toBe(401);
    }
    expect((await request.post("/api/events")).status()).toBe(401);
  });

  test("a magic link cannot be redeemed twice", async ({ page }) => {
    await clearMagicLink();
    await page.request.post("/api/auth/sign-in/magic-link", {
      data: { email: "organizer@fever.local", callbackURL: "/dashboard" },
    });
    const link = await readMagicLink();

    await page.goto(link);
    await page.waitForURL(/\/dashboard|\/onboarding/);

    // Second use of the same token must not produce another session.
    await page.context().clearCookies();
    await page.goto(link);

    const session = await page.request.get("/api/auth/get-session");
    const body = await session.text();
    expect(body === "" || body === "null" || !JSON.parse(body || "null")?.user).toBeTruthy();
  });

  test("a cross-site sign-out attempt is refused", async ({ page }) => {
    await signIn(page);

    // No Origin header: Better Auth's CSRF guard must reject this outright.
    const forged = await page.request.post("/api/auth/sign-out", {
      headers: { "content-type": "application/json" },
      data: {},
    });
    expect(forged.status()).toBe(403);

    // And the session must survive the attempt.
    expect((await page.request.get("/api/profile")).status()).toBe(200);
  });

  test("signing out revokes access to protected endpoints", async ({ page }) => {
    await signIn(page);
    expect((await page.request.get("/api/profile")).status()).toBe(200);

    // Better Auth requires both a JSON content type and an Origin header on
    // state-changing requests — the latter is its CSRF check, so a plain
    // cross-site POST cannot sign anyone out.
    const out = await page.request.post("/api/auth/sign-out", {
      headers: {
        "content-type": "application/json",
        origin: new URL(page.url()).origin,
      },
      data: {},
    });
    expect(out.ok(), await out.text()).toBeTruthy();

    // The session cookie is cached client-side, so assert on what actually
    // matters: the server no longer honours the request.
    expect((await page.request.get("/api/profile")).status()).toBe(401);
  });
});
