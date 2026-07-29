import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@careerpilot.dev");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole("link", { name: /Demo Career Workspace/ }).click();
  await page.waitForURL(/\/dashboard\/[^/]+$/);
}

test.describe("opportunity intelligence frontend", () => {
  test("researches, saves, and tailors a recommended role", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await signIn(page);
    await expect(page.getByRole("heading", { name: "Opportunity Intelligence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Career Workspace" })).toBeVisible();
    await expect(page.getByText("Product Analyst", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Search workspace").fill("Razorpay");
    await expect(page.getByText("Business Analyst", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Search workspace").clear();
    await page.getByLabel("Role").selectOption("Data");
    await expect(page.getByText("Junior Data Analyst", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Role").selectOption("All");

    await page.getByRole("button", { name: "Junior Data Analyst Freshworks SQL · Python · Data visualization · Dashboards" }).click();
    await expect(page.getByRole("heading", { name: "Junior Data Analyst" })).toBeVisible();
    await expect(page.getByText("81%", { exact: true }).last()).toBeVisible();

    await page.getByRole("button", { name: "Save Junior Data Analyst", exact: true }).click();
    await page.getByRole("tab", { name: /Saved/ }).click();
    await expect(page.getByText("Junior Data Analyst", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Tailor application" }).click();
    await expect(page.getByRole("button", { name: "Application tailored" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Freshworks");
    expect(consoleErrors).toEqual([]);
  });

  test("matches the selected desktop state and stays usable on mobile", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 1024 });
    await expect(page.getByLabel("Selected opportunity details")).toBeVisible();
    await page.screenshot({ path: "test-results/opportunity-intelligence-desktop.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await page.screenshot({ path: "test-results/opportunity-intelligence-mobile.png", fullPage: true });
  });
});
