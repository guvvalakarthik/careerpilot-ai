import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.*/);
  });

  test("login page has form elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 });
  });

  test("register page has form elements", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("input").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Protected routes", () => {
  test("dashboard requires auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("workspace page requires auth", async ({ page }) => {
    await page.goto("/dashboard/test-workspace-id");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
