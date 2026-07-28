import { expect, test } from "@playwright/test";

test.describe("critical authenticated flows", () => {
  test("seeded user can sign in, open a workspace, and sign out", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("demo@careerpilot.dev");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Workspaces" })).toBeVisible();
    await page.getByRole("link", { name: /Demo Career Workspace/ }).click();

    await expect(page).toHaveURL(/\/dashboard\/[^/]+$/, { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: "Demo Career Workspace" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login$/);
    await page.goto("/dashboard");
    await page.waitForURL((url) =>
      url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/dashboard",
    );
  });

  test("new user can register and complete onboarding", async ({ page }, testInfo) => {
    const marker = `${Date.now()}-${testInfo.workerIndex}-${testInfo.retry}`;
    const email = `e2e-${marker}@test.invalid`;
    const workspaceName = `E2E Workspace ${marker}`;

    await page.goto("/register");
    await page.getByLabel("Name").fill("E2E Candidate");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("E2ePass!2026");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Create your workspace" })).toBeVisible();
    await page.getByPlaceholder("e.g. My Job Search 2026").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();

    await expect(page.getByRole("heading", { name: "Set up your profile" })).toBeVisible();
    await page.getByPlaceholder("e.g. Senior Frontend Engineer").fill("Product Engineer");
    await page.getByPlaceholder("Or type a custom skill and press Enter").fill("TypeScript");
    await page.getByPlaceholder("Or type a custom skill and press Enter").press("Enter");
    await page.getByPlaceholder("e.g. 5").fill("3");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByRole("heading", { name: "You're all set!" })).toBeVisible();
    await page.getByRole("button", { name: "Go to dashboard" }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: new RegExp(workspaceName) })).toBeVisible();
  });
});
