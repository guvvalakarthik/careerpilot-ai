import { expect, test } from "@playwright/test";

test.describe("public and protected access", () => {
  test("home page exposes the primary authentication paths", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Search smarter/ })).toBeVisible();
    const navigation = page.getByRole("navigation");
    await expect(navigation.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    await expect(navigation.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });

  test("protected routes redirect to login with a callback", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL((url) =>
      url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/dashboard",
    );
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });
});
