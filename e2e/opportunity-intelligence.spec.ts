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
  test("persists saved roles and creates a tailoring task in the real application", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await signIn(page);
    await expect(page.getByRole("heading", { name: "Opportunity Intelligence" })).toBeVisible();
    await expect(page.getByText("Product Analyst", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Search workspace").fill("Razorpay");
    await expect(page.getByText("Business Analyst", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Search workspace").clear();
    await page.getByLabel("Role").selectOption("Junior");
    await expect(page.getByText("Junior Data Analyst", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Role").selectOption("All");

    await page.getByText("Junior Data Analyst", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Junior Data Analyst" })).toBeVisible();
    await expect(page.getByText("81%", { exact: true }).last()).toBeVisible();

    const removeSavedRole = page.getByRole("button", { name: "Remove Junior Data Analyst", exact: true });
    if (await removeSavedRole.isVisible()) {
      await removeSavedRole.click();
      await expect(page.getByRole("button", { name: "Save Junior Data Analyst", exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Save Junior Data Analyst", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Role saved");

    await page.reload();
    await page.getByRole("tab", { name: /Saved/ }).click();
    await expect(page.getByText("Junior Data Analyst", { exact: true }).first()).toBeVisible();
    await page.getByText("Junior Data Analyst", { exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Saved", exact: true }).last()).toBeVisible();

    await page.getByRole("button", { name: /(?:Start|Continue) tailoring/ }).click();
    await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible();
    const tailoringTask = page.getByText("Tailor application for Junior Data Analyst", { exact: true });
    await expect(tailoringTask).toHaveCount(1);
    await expect(tailoringTask).toBeVisible();

    await page.getByRole("button", { name: "Close application details" }).click();
    await page.getByRole("button", { name: "Opportunities" }).click();
    await page.getByRole("tab", { name: /Saved/ }).click();
    await page.getByText("Junior Data Analyst", { exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Continue tailoring" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("keeps working controls usable on desktop and mobile", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 1024 });
    await expect(page.getByLabel("Selected opportunity details")).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
  });
});