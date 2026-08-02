import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("states the pitch and links to sign-up", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Sell tickets");

    // The fee comparison is the argument, so it must actually be on the page.
    await expect(page.getByText("$0.00")).toBeVisible();

    await page.getByRole("link", { name: "Create an event" }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("the FAQ opens without JavaScript-driven state", async ({ page }) => {
    await page.goto("/#faq");

    const question = page.getByRole("group").filter({
      hasText: "How do you make money",
    });
    // Native details/summary: the answer is in the DOM, hidden until opened.
    await expect(question).toBeVisible();
    await question.locator("summary").click();
    await expect(question).toContainText("open-source project");
  });

  test("is usable on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Nothing may push the page wider than the viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
