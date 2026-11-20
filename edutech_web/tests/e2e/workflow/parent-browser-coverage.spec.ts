import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectParentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function expectEither(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    if (await page.getByText(pattern).first().isVisible().catch(() => false)) {
      await expect(page.getByText(pattern).first()).toBeVisible();
      return;
    }
  }

  throw new Error(`Expected one of the parent patterns to be visible: ${patterns.map(String).join(", ")}`);
}

async function saveParentPreferences(page: Page) {
  const saveButton = page.getByRole("button", { name: /save preferences/i }).first();
  await expect(saveButton).toBeEnabled();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const saveResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/parent/preferences") &&
          response.request().method() === "PATCH",
        { timeout: 5000 },
      )
      .catch(() => null);

    await saveButton.click();
    const saveResponse = await saveResponsePromise;
    if (saveResponse) {
      expect(saveResponse.ok(), await saveResponse.text().catch(() => "")).toBe(true);
      return;
    }

    await page.waitForTimeout(500 * attempt);
  }

  throw new Error("Parent preferences save did not issue a PATCH request.");
}

test.describe("Parent browser coverage", () => {
  test.skip(testRequiresRole("parent"), "Parent Playwright credentials are not configured.");

  test("@workflow parent can traverse dashboard, children, progress, and alerts surfaces", async ({
    page,
  }) => {
    await loginAsRole(page, "parent");
    await expectParentWorkspace(page);

    await gotoWithRetry(page, "/parent/dashboard");
    await expect(page.getByRole("heading", { name: /family dashboard/i }).first()).toBeVisible();
    await expect(page.getByText(/parent workspace/i).first()).toBeVisible();
    await expectEither(page, [
      /open progress/i,
      /open alerts/i,
      /no active child links are available yet/i,
      /waiting for active links/i,
    ]);

    await page.getByRole("link", { name: /children/i }).first().click();
    await expect(page).toHaveURL(/\/parent\/children(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /linked children/i }).first()).toBeVisible();
    await expectEither(page, [
      /child access and visibility/i,
      /no child relationships are active yet/i,
      /waiting for active links/i,
    ]);

    await page.getByRole("link", { name: /progress/i }).first().click();
    await expect(page).toHaveURL(/\/parent\/progress(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic progress/i }).first()).toBeVisible();
    await expectEither(page, [
      /academic snapshot/i,
      /no child with progress visibility is available/i,
      /waiting for progress-enabled link/i,
    ]);

    await page.getByRole("link", { name: /alerts/i }).first().click();
    await expect(page).toHaveURL(/\/parent\/alerts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /family alerts/i }).first()).toBeVisible();
    await expectEither(page, [
      /alert center/i,
      /family alert queue/i,
      /no linked children are available for alerts/i,
      /waiting for alert-enabled link/i,
    ]);
  });

  test("@workflow parent can review settings and search on the parent workspace", async ({ page }) => {
    await loginAsRole(page, "parent");
    await expectParentWorkspace(page);

    await gotoWithRetry(page, "/parent/settings");
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
    await expect(page.getByText(/parent access is active and relationship-driven/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save preferences/i }).first()).toBeVisible();

    await saveParentPreferences(page);
    await expect(page.getByText(/parent preferences updated successfully/i).first()).toBeVisible();

    await gotoWithRetry(page, "/parent/search");
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();
    await expect(page.getByRole("searchbox", { name: /search/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workspace/i }).first()).toBeVisible();
  });
});
