import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
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

async function expectOneOfVisible(page: Page, selectors: Array<ReturnType<Page["locator"]>>) {
  for (const selector of selectors) {
    if (await selector.isVisible().catch(() => false)) {
      await expect(selector).toBeVisible();
      return selector;
    }
  }

  throw new Error("Expected at least one mobile workspace selector to be visible.");
}

test.describe("Student mobile workspace sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student mobile shell can open key workspace routes from the collapsible navigation", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/dashboard");
    await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();
    await expect(page.getByText(/action queue/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open attempt timeline/i }).first()).toBeVisible();

    const mobileNavToggle = page.getByRole("button", { name: /menu/i });
    const mobileNav = page.locator("#mobile-workspace-menu");

    await mobileNavToggle.click();
    await expect(page.getByRole("navigation", { name: /student navigation/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^tests$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^results$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^analytics$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^tests$/i }).click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /menu/i }).click();
    await mobileNav.getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /menu/i }).click();
    await mobileNav.getByRole("link", { name: /^analytics$/i }).click();
    await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open action center/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /menu/i }).click();
    await mobileNav.getByRole("link", { name: /^profile$/i }).click();
    await expect(page).toHaveURL(/\/app\/profile(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /profile/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /menu/i }).click();
    await mobileNav.getByRole("link", { name: /^dashboard$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/available for you/i).first()).toBeVisible();

    await page.getByRole("button", { name: /menu/i }).click();
    await expect(page.getByRole("button", { name: /close/i })).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();
    await expect(page.getByRole("navigation", { name: /student navigation/i })).toBeHidden();
  });

  test("@workflow student mobile viewport keeps core exam, attempts, and results surfaces reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/exams");
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

    const examEmptyState = page.getByText(/your mock-test workspace is empty right now/i).first();
    if (!(await examEmptyState.isVisible().catch(() => false))) {
      const detailEntry = await expectOneOfVisible(page, [
        page.getByRole("link", { name: /view full detail/i }).first(),
        page.getByRole("link", { name: /^detail$/i }).first(),
        page.getByRole("link", { name: /view details/i }).first(),
      ]);
      await detailEntry.click();
      await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/primary action/i).first()).toBeVisible();
      await expect(page.getByText(/section overview/i).first()).toBeVisible();
      await expect(
        page.getByRole("link", { name: /back to exams/i }).first(),
      ).toBeVisible();
      await page.getByRole("link", { name: /back to exams/i }).first().click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    } else {
      await expect(examEmptyState).toBeVisible();
      await expect(page.getByRole("link", { name: /refresh/i }).first()).toBeVisible();
    }

    await gotoWithRetry(page, "/app/attempts");
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    const attemptsEmptyState = page.getByText(/your attempt history is empty right now/i).first();
    if (await attemptsEmptyState.isVisible().catch(() => false)) {
      await expect(attemptsEmptyState).toBeVisible();
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    } else {
      await expect(page.getByText(/attempt continuity loop/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open practice/i }).first()).toBeVisible();
    }

    await gotoWithRetry(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    const resultsEmptyState = page.getByText(/your result history is empty right now/i).first();
    if (await resultsEmptyState.isVisible().catch(() => false)) {
      await expect(resultsEmptyState).toBeVisible();
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    } else {
      await expect(page.getByText(/results recovery loop/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open attempts/i }).first()).toBeVisible();
    }
  });
});
