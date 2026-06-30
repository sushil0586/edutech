import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

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

async function expectOneOfVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }

  throw new Error("Expected at least one locator to be visible.");
}

async function resolveExamDetailHref(page: Page) {
  await gotoWithRetry(page, "/app/exams");
  await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /mock tests/i }).first()).toBeVisible();

  const emptyState = page.getByText(/your mock-test workspace is empty right now/i);
  if (!(await emptyState.isVisible().catch(() => false))) {
    const detailLink = await expectOneOfVisible([
      page.getByRole("link", { name: /view full detail/i }).first(),
      page.getByRole("link", { name: /^detail$/i }).first(),
    ]);
    return await detailLink.getAttribute("href");
  }

  await gotoWithRetry(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/recommended for you/i).first()).toBeVisible();

  const dashboardLink = page.getByRole("link", { name: /view details/i }).first();
  await expect(dashboardLink).toBeVisible();
  return await dashboardLink.getAttribute("href");
}

async function resolveAttemptRuntimeHref(page: Page) {
  await gotoWithRetry(page, "/app/attempts");
  await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();

  const resumeFromAttempts = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromAttempts.isVisible().catch(() => false)) {
    return await resumeFromAttempts.getAttribute("href");
  }

  await gotoWithRetry(page, "/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard(?:\?.*)?$/);
  await expect(page.getByText(/action queue/i).first()).toBeVisible();

  const resumeFromDashboard = page.getByRole("link", { name: /resume attempt/i }).first();
  if (await resumeFromDashboard.isVisible().catch(() => false)) {
    return await resumeFromDashboard.getAttribute("href");
  }

  return null;
}

test.describe("Student cross-browser exam detail and runtime sanity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can open exam detail and conditional runtime routes across browser engines", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const detailHref = await resolveExamDetailHref(page);
    expect(detailHref).toMatch(/^\/app\/exams\/[^/]+$/);

    await gotoWithRetry(page, detailHref!);
    await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
    await expect(page.getByText(/availability and runtime/i).first()).toBeVisible();
    await expect(page.getByText(/primary action/i).first()).toBeVisible();
    await expect(page.getByText(/section overview/i).first()).toBeVisible();
    await expect(page.getByText(/question blueprint/i).first()).toBeVisible();

    const backToExams = page.getByRole("link", { name: /back to exams/i }).first();
    await expect(backToExams).toBeVisible();
    await backToExams.click();
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);

    const attemptHref = await resolveAttemptRuntimeHref(page);
    if (!attemptHref) {
      test.skip(true, "Student seeded account does not currently expose a resumable attempt runtime route.");
      return;
    }

    expect(attemptHref).toMatch(/^\/app\/attempts\/[^/]+$/);
    await gotoWithRetry(page, attemptHref);
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);

    const activeVisible = await page
      .getByRole("button", { name: /^save answer$/i })
      .first()
      .isVisible()
      .catch(() => false);
    const lockedVisible = await page
      .getByRole("link", { name: /refresh attempt state|refresh mock state|view attempt summary|view mock summary/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(activeVisible || lockedVisible).toBe(true);

    if (activeVisible) {
      await expect(page.getByText(/progress/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed save/i).first()).toBeVisible();
      await expect(page.getByText(/question palette/i).first()).toBeVisible();
    }

    if (lockedVisible) {
      await expect(
        page.getByText(/this test is no longer editable|this attempt has expired/i).first(),
      ).toBeVisible();
    }
  });
});
