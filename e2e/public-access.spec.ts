import { expect, test } from "@playwright/test";

test.describe("public and protected access", () => {
  test("home page exposes the primary authentication paths", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Search smarter/ })).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    await expect(navigation.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });

  test("password reset can be completed locally without email credentials", async ({ page }) => {
    const email = `reset-${Date.now()}@test.invalid`;
    const registration = await page.request.post("/api/register", {
      data: { name: "Reset Test", email, password: "Initial1!" },
    });
    expect(registration.ok()).toBe(true);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await page.getByRole("link", { name: "Open local reset link" }).click();

    await page.getByLabel("New password").fill("Updated2!");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Password reset successfully!")).toBeVisible();
  });

  test("protected routes redirect to login with a callback", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL((url) =>
      url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/dashboard",
    );
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
