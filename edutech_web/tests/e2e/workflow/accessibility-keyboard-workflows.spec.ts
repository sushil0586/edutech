import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

async function expectFocused(locator: Locator) {
  await expect(locator).toBeFocused();
}

async function tabTo(page: Page, locator: Locator, maxTabs = 40) {
  for (let step = 0; step < maxTabs; step += 1) {
    if (await locator.evaluate((node) => node === document.activeElement).catch(() => false)) {
      return;
    }
    await page.keyboard.press("Tab");
  }

  throw new Error("Could not reach expected focus target with keyboard Tab navigation.");
}

test.describe("Accessibility keyboard workflows", () => {
  test("@workflow @a11y student reports hub supports keyboard-only report handoffs", async ({ page }) => {
    test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/reports");
    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();

    const firstReportLink = page.getByRole("link", { name: /open results report|open wrong questions report|open time management report/i }).first();
    await tabTo(page, firstReportLink);
    await expectFocused(firstReportLink);

    const linkLabel = ((await firstReportLink.textContent()) ?? "").trim().toLowerCase();
    await firstReportLink.press("Enter");

    if (linkLabel.includes("results")) {
      await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    } else if (linkLabel.includes("wrong")) {
      await expect(page).toHaveURL(/\/app\/analytics\/wrong-questions(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /wrong questions report/i }).first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/app\/analytics\/time-management(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /time management report/i }).first()).toBeVisible();
    }
  });

  test("@workflow @a11y teacher exam detail keeps core action lane keyboard reachable", async ({ page }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /view exam/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/]+(?:\?.*)?$/);

    const primaryAction = page.getByRole("link", { name: /continue setup|view builder/i }).first();
    await tabTo(page, primaryAction);
    await expectFocused(primaryAction);

    const refreshButton = page.getByRole("button", { name: /^refresh$/i }).first();
    await tabTo(page, refreshButton, 20);
    await expectFocused(refreshButton);
    await refreshButton.press("Enter");
    await expect(page.getByText(/status refreshed|exam state refreshed|unable to update/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("@workflow @a11y institute live monitor controls are keyboard operable", async ({ page }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results/live");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /live monitor is useful only during active exam windows/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      const openExamsLink = page.getByRole("link", { name: /open exams/i }).first();
      await tabTo(page, openExamsLink);
      await expectFocused(openExamsLink);
      await openExamsLink.press("Enter");
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }

    const toggleRefreshButton = page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i }).first();
    await tabTo(page, toggleRefreshButton);
    await expectFocused(toggleRefreshButton);
    await toggleRefreshButton.press("Enter");
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i }).first()).toBeVisible();

    const refreshNowButton = page.getByRole("button", { name: /refresh now/i }).first();
    await page.keyboard.press("Tab");
    await expectFocused(refreshNowButton);
    await refreshNowButton.press("Enter");
    await expect(page.getByText(/last refreshed at|waiting for first refresh cycle/i).first()).toBeVisible();
  });

  test("@workflow @a11y teacher live monitor and question editor keep dense actions keyboard reachable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/results/live");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();

    const refreshNowButton = page.getByRole("button", { name: /refresh now/i }).first();
    await tabTo(page, refreshNowButton);
    await expectFocused(refreshNowButton);
    await refreshNowButton.press("Enter");
    await expect(page.getByText(/last refreshed at|waiting for first refresh cycle/i).first()).toBeVisible();

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const questionDetailHref = await page.locator("a").evaluateAll((anchors) => {
      const match = anchors
        .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
        .find((candidate) => /^\/teacher\/question-bank\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
      return match ?? null;
    });
    expect(questionDetailHref).toBeTruthy();

    await page.goto(questionDetailHref!);
    await expect(page.getByRole("heading", { name: /edit question/i }).first()).toBeVisible();

    const programSelect = page.locator('select[name="program"]').first();
    await tabTo(page, programSelect);
    await expectFocused(programSelect);

    const primaryTextarea = page.locator('textarea[name="question_text"]').first();
    await tabTo(page, primaryTextarea, 25);
    await expectFocused(primaryTextarea);
  });

  test("@workflow @a11y institute exam detail jump link keeps delivery controls keyboard reachable", async ({
    page,
  }) => {
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      const quickCreateLink = page.getByRole("link", { name: /quick create/i }).first();
      await tabTo(page, quickCreateLink);
      await expectFocused(quickCreateLink);
      await quickCreateLink.press("Enter");
      await expect(page).toHaveURL(/\/institute\/exams\/new(?:\?.*)?$/);
      return;
    }

    const examDetailHref = await page.getByRole("link", { name: /open exam/i }).first().getAttribute("href");
    expect(examDetailHref).toBeTruthy();
    await page.goto(examDetailHref!);
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

    const skipLink = page.getByRole("link", { name: /skip to main content/i }).first();
    await page.keyboard.press("Tab");
    await expectFocused(skipLink);
    await skipLink.press("Enter");
    await expect(page.locator("main#app-main-content")).toBeFocused();

    const jumpLink = page.getByRole("link", { name: /jump to delivery actions/i }).first();
    await jumpLink.focus();
    await expectFocused(jumpLink);
    await jumpLink.press("Enter");
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?#exam-actions$/);

    const refreshStatusButton = page.getByRole("button", { name: /refresh status/i }).first();
    await refreshStatusButton.focus();
    await expectFocused(refreshStatusButton);
    await refreshStatusButton.press("Enter");
    await expect(page.getByText(/status refreshed|exam state refreshed|unable to update/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

});
