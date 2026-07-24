import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2, [role='heading']").first()).toBeVisible({ timeout: 10000 });
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

test.describe("Register page", () => {
  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("form, input").first()).toBeVisible({ timeout: 10000 });
  });
});
