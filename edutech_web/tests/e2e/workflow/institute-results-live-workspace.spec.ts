import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteLiveMonitorWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
  await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
  await expect(page.getByText(/live monitor refresh/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();
}

async function expectAttemptDrillOrEmptyState(page: Page) {
  const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt/i }).first();
  if (await inspectAttemptLink.isVisible().catch(() => false)) {
    await inspectAttemptLink.click();
    await expect(page).toHaveURL(/\/institute\/results\/live\?[^#]*attempt=/);
    await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
    await expect(page.getByText(/decision support/i).first()).toBeVisible();
    await expect(page.getByText(/intervention notes/i).first()).toBeVisible();
    return;
  }

  const reviewLink = page.getByRole("link", { name: /^review$/i }).first();
  if (await reviewLink.isVisible().catch(() => false)) {
    await reviewLink.click();
    await expect(page).toHaveURL(/\/institute\/results\/live\?[^#]*attempt=/);
    await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
    return;
  }

  const inspectWatchLink = page.getByRole("link", { name: /^inspect$/i }).first();
  if (await inspectWatchLink.isVisible().catch(() => false)) {
    await inspectWatchLink.click();
    await expect(page).toHaveURL(/\/institute\/results\/live\?[^#]*attempt=/);
    await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
    return;
  }

  await expect(
    page.getByText(/no attempts currently need intervention beyond routine monitoring/i).first(),
  ).toBeVisible();
}

test.describe("Institute live monitor workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can inspect live monitor controls and drill into an attempt when available", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results/live");
    await expectInstituteLiveMonitorWorkspace(page);

    const toggleRefreshButton = page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i });
    await toggleRefreshButton.click();
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toHaveText(
      /resume auto refresh/i,
    );
    await toggleRefreshButton.click();
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toHaveText(
      /pause auto refresh/i,
    );

    await page.getByRole("button", { name: /refresh now/i }).click();
    await expect(page.getByText(/last refreshed at|waiting for first refresh cycle/i).first()).toBeVisible();

    await expectAttemptDrillOrEmptyState(page);
  });
});
