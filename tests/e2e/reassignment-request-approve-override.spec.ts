import { expect, test } from "@playwright/test";
import { E2E_COVERING_MEMBER_EMAIL, E2E_COVERING_MEMBER_PASSWORD } from "./global-setup";
import { signInAsAdmin, signInAsMember, signInManually } from "./helpers";

/**
 * The one flow task 24 explicitly requires: a member requests
 * reassignment, an admin approves it, and the resulting override shows
 * up on the new (covering) assignee's own dashboard. Nora
 * (nora@taskdeck.local) plays "new assignee" — global-setup.ts gives
 * her a known password so this spec can sign into her real seeded
 * account via the manual LoginForm.
 */
test("request -> approve -> override is visible on the new assignee's dashboard", async ({
  page,
}) => {
  await signInAsMember(page); // Oskar

  // "This month" widens the window past whatever happens to be due
  // "today" on the day this suite runs, so there's reliably at least
  // one task row with a "Request reassignment" button.
  await page.getByRole("tab", { name: "This month" }).click();
  // The task list view carries the company-level labels this spec reads.
  await page.getByRole("button", { name: "Task list" }).click();

  // Person-assigned only (no "Group – …" chip) — a team-assigned row's
  // override label reads "Covering for <team name>", not the requester's
  // own name, since the task itself isn't assigned to any one person.
  const taskRow = page
    .getByTestId("task-row")
    .filter({ has: page.getByRole("button", { name: /^More actions for/ }) })
    .filter({ hasNotText: "Group –" })
    .first();
  await expect(taskRow).toBeVisible();
  const taskTitle = await taskRow.getAttribute("data-task-title");
  expect(taskTitle).toBeTruthy();

  await taskRow.getByRole("button", { name: /^More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Request reassignment" }).click();

  await page.getByLabel("Reason").fill("E2E test — covering while I'm out.");

  await page.getByLabel("Suggested assignee (optional)").click();
  await page.getByRole("option", { name: "Nora Eide" }).click();

  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Reassignment requested").first()).toBeVisible();

  await signInAsAdmin(page); // Mia
  await page.goto("/requests");

  const requestRow = page.getByRole("row", { name: /Oskar Lund/ });
  await expect(requestRow).toBeVisible();
  await requestRow.getByRole("button", { name: "Approve" }).click();

  // The dialog's "New assignee" defaults to the suggested assignee
  // (Nora) already — just confirm. Scoped to the dialog since the
  // table row behind it still has its own "Approve" button in the DOM.
  const approveDialog = page.getByRole("dialog");
  await approveDialog.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Request approved")).toBeVisible();

  await signInManually(page, E2E_COVERING_MEMBER_EMAIL, E2E_COVERING_MEMBER_PASSWORD); // Nora
  await page.getByRole("tab", { name: "This month" }).click();
  await page.getByRole("button", { name: "Task list" }).click();

  const coveringRow = page.getByTestId("task-row").filter({ hasText: taskTitle! }).first();
  await expect(coveringRow).toBeVisible();
  await coveringRow.locator("button[aria-expanded]").first().click();

  await expect(coveringRow.getByText(/Covering for Oskar Lund/)).toBeVisible();
});
