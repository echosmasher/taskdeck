import { expect, test } from "@playwright/test";
import { signInAsAdmin, signInAsMember } from "./helpers";

test.describe("demo sign-in (task 22) and role-gated nav", () => {
  test("admin lands on the dashboard with admin-only nav visible", async ({ page }) => {
    await signInAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
  });

  test("member lands on the dashboard without admin-only nav", async ({ page }) => {
    await signInAsMember(page);
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Tasks" })).toHaveCount(0);
  });

  test("member hitting an admin-only route directly is redirected home", async ({ page }) => {
    await signInAsMember(page);
    await page.goto("/tasks");
    await expect(page).toHaveURL("/");
  });
});
