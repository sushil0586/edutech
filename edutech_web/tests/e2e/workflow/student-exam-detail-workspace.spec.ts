import { expect, test, type Locator, type Page } from "@playwright/test";
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

async function expectOneOfVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveExamDetailEntry(page: Page) {
  await gotoWithRetry(page, "/app/exams");
  await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

  const emptyState = page.getByText(/your mock-test workspace is empty right now/i);
  const hasEmptyState = await emptyState.isVisible().catch(() => false);

  if (!hasEmptyState) {
    const examsEntry = await expectOneOfVisible([
      page.getByRole("link", { name: /view full detail/i }).first(),
      page.getByRole("link", { name: /^detail$/i }).first(),
    ]);

    return {
      origin: "exams" as const,
      entry: examsEntry,
      href: await examsEntry.getAttribute("href"),
    };
  }

  await gotoWithRetry(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/recommended for you/i).first()).toBeVisible();

  const dashboardEntry = page.getByRole("link", { name: /view details/i }).first();
  await expect(dashboardEntry).toBeVisible();

  return {
    origin: "dashboard" as const,
    entry: dashboardEntry,
    href: await dashboardEntry.getAttribute("href"),
  };
}

test.describe("Student exam detail workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate exam detail readiness, policy surfaces, and safe handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const detailSource = await resolveExamDetailEntry(page);
    const detailHref = detailSource.href;
    expect(detailHref).toMatch(/^\/app\/exams\/[^/]+$/);

    await detailSource.entry.click();
    await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
    await expect(page.getByText(/availability and runtime/i).first()).toBeVisible();
    await expect(page.getByText(/primary action/i).first()).toBeVisible();
    await expect(page.getByText(/exam rules/i).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/question blueprint/i).first()).toBeVisible();

    await expect(
      page.getByText(/results are .*review is/i).first(),
    ).toBeVisible();

    const primaryActionRegion = page
      .locator(".contentCard")
      .filter({ has: page.getByText(/^primary action$/i) })
      .first();
    await expect(primaryActionRegion).toBeVisible();

    await expectOneOfVisible([
      primaryActionRegion.getByRole("link", { name: /resume .*|open attempt summary|open answer review|open wallet/i }).first(),
      primaryActionRegion.getByRole("button", { name: /start .*|unlock with .*stars|not available yet/i }).first(),
    ]);

    const safeHandoff = await (async () => {
      const reviewLink = primaryActionRegion.getByRole("link", { name: /open answer review/i }).first();
      if (await reviewLink.isVisible().catch(() => false)) {
        return reviewLink;
      }

      const summaryLink = primaryActionRegion.getByRole("link", { name: /open attempt summary/i }).first();
      if (await summaryLink.isVisible().catch(() => false)) {
        return summaryLink;
      }

      const resumeLink = primaryActionRegion.getByRole("link", { name: /resume .*/i }).first();
      if (await resumeLink.isVisible().catch(() => false)) {
        return resumeLink;
      }

      const walletLink = primaryActionRegion.getByRole("link", { name: /open wallet/i }).first();
      if (await walletLink.isVisible().catch(() => false)) {
        return walletLink;
      }

      return null;
    })();

    if (safeHandoff) {
      await safeHandoff.click();
      await expect(page).toHaveURL(
        /\/app\/(attempts\/[^/?#]+(?:\/summary|\/review)?|wallet)(?:\?.*)?$/,
      );
    }

    await gotoWithRetry(page, detailHref!);
    await expect(page).toHaveURL(new RegExp(`${detailHref!.replace(/\//g, "\\/")}(?:\\?.*)?$`));
    await page.getByRole("link", { name: /back to exams/i }).click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  });
});
