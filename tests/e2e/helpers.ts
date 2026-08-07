import type { Page } from "@playwright/test";

/**
 * The middleware redirects a signed-in user away from /login (see
 * src/proxy.ts) — clearing cookies first is what actually lets these
 * helpers switch accounts mid-test, not just re-visiting /login.
 */
async function signOutFirst(page: Page) {
  await page.context().clearCookies();
}

export async function signInAsAdmin(page: Page) {
  await signOutFirst(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore as Admin" }).click();
  await page.waitForURL("/");
}

export async function signInAsMember(page: Page) {
  await signOutFirst(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore as Member" }).click();
  await page.waitForURL("/");
}

export async function signInManually(page: Page, email: string, password: string) {
  await signOutFirst(page);
  await page.goto("/login");
  // The manual-login form lives behind a <details>/<summary> disclosure
  // (demo-landing.tsx) — target the <summary> directly rather than
  // relying on its implicit ARIA role mapping to "button".
  await page.locator("summary", { hasText: "Sign in with an account instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}
