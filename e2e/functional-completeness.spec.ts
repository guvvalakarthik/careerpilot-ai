import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@careerpilot.dev");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/);
}

function localDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

test("core workspace actions persist, correct, surface overdue work, and delete safely", async ({ page }) => {
  const marker = Date.now();
  const workspaceName = `Functional Audit ${marker}`;
  const roleTitle = `Audit Engineer ${marker}`;
  const overdueTask = `Review application ${marker}`;

  await signIn(page);
  await page.getByRole("button", { name: "New Workspace" }).first().click();
  await page.getByLabel("Workspace name").fill(workspaceName);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL(/\/dashboard\/[^/]+$/);

  await page.getByRole("button", { name: "Applications" }).click();
  await page.getByRole("button", { name: "Quick Capture" }).click();
  await page.getByRole("button", { name: "Paste JD" }).click();
  await page.getByPlaceholder("Paste the full job description here, or upload a PDF...").fill(
    "Build and test TypeScript services for a career platform.",
  );
  await page.getByPlaceholder("e.g. Google").fill("Audit Company");
  await page.getByPlaceholder("e.g. SDE II").fill(roleTitle);
  await page.getByRole("button", { name: "Capture", exact: true }).click();
  await expect(page.getByText("Captured! AI extracted job details. Added to your pipeline.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quick Capture" })).toBeHidden({ timeout: 10_000 });

  await page.getByText(roleTitle, { exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Application details" });
  await expect(drawer).toBeVisible();

  await drawer.getByRole("button", { name: "Applied", exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Captured", exact: true })).toBeVisible();
  await drawer.getByRole("button", { name: "Captured", exact: true }).click();
  await expect(drawer.getByRole("button", { name: "Applied", exact: true })).toBeVisible();

  await drawer.getByRole("button", { name: "Add task" }).click();
  await drawer.getByPlaceholder("Task title *").fill(overdueTask);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1_000);
  await drawer.locator('input[type="datetime-local"]').fill(localDateTimeInput(yesterday));
  await drawer.getByRole("button", { name: "Add task" }).click();
  await expect(drawer.getByText(overdueTask, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Close application details" }).click();
  await page.getByRole("button", { name: "Interview Prep" }).click();
  await expect(page.getByText("1 overdue task", { exact: true })).toBeVisible();
  await expect(page.getByText(overdueTask, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Karthik/ }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel(new RegExp(`Type ${workspaceName} to confirm`)).fill(workspaceName);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: new RegExp(workspaceName) })).toHaveCount(0);
});
