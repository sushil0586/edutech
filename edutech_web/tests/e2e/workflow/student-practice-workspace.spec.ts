import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function expectStudentPracticeWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

async function expectQuickPracticeControls(page: Page) {
  const quickTabs = page.locator(".studentAttemptsQuickBar").first();
  if (await quickTabs.isVisible().catch(() => false)) {
    await expect(quickTabs.getByRole("link", { name: /^all/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /resume/i }).first()).toBeVisible();
    const reviewReadyTab = quickTabs.getByRole("link", { name: /review ready/i }).first();
    if (await reviewReadyTab.isVisible().catch(() => false)) {
      await expect(reviewReadyTab).toBeVisible();
    }
    return;
  }

  await expect(page.getByText(/quick filters/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^all$/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
}

test.describe("Student practice workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate compact practice workspace actions and filters", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await page.goto("/app/practice");
    await expectStudentPracticeWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (!(await filtersCard.isVisible().catch(() => false))) {
      await expect(page.getByText(/your practice workspace is empty right now/i).first()).toBeVisible();
      await page.getByRole("link", { name: /open weak areas/i }).first().click();
      await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
      return;
    }

    await expectQuickPracticeControls(page);

    const practiceForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
    await practiceForm.locator('select[name="practice_filter"]').selectOption("review");
    await practiceForm.locator('select[name="practice_sort"]').selectOption("shortest");
    await practiceForm.locator('select[name="practice_group"]').selectOption("subject");
    await practiceForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=review/);
    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_sort=shortest/);
    await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_group=subject/);

    const noMatchState = page.getByText(/no practice sets match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset practice filters/i }).first().click();
      await expectStudentPracticeWorkspace(page);
      return;
    }

    const readyNowTab = page.getByRole("link", { name: /ready now/i }).first();
    if (await readyNowTab.isVisible().catch(() => false)) {
      await readyNowTab.click();
      await expect(page).toHaveURL(/\/app\/practice\?[^#]*practice_filter=ready/);
    }

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectStudentPracticeWorkspace(page);

    const practiceCard = await Promise.all([
      page.locator("article.studentPracticeCompactCard").first().isVisible().catch(() => false),
      page.locator("article.studentResultSurface").first().isVisible().catch(() => false),
    ]).then((matches) => {
      if (matches[0]) return page.locator("article.studentPracticeCompactCard").first();
      if (matches[1]) return page.locator("article.studentResultSurface").first();
      return null;
    });

    if (!practiceCard) {
      await expect(
        await firstVisible([
          page.getByText(/no practice sets match these controls/i).first(),
          page.getByText(/your practice workspace is empty right now/i).first(),
          page.getByText(/practice workspace/i).first(),
        ]),
      ).toBeVisible();
      return;
    }

    await expect(practiceCard).toBeVisible();
    await expect(
      await firstVisible([
        practiceCard.locator(".studentAttemptsCardTitle strong").first(),
        practiceCard.locator(".studentResultSurfaceHead strong").first(),
      ]),
    ).toBeVisible();

    const primaryActionCandidates = [
      practiceCard.getByRole("button", { name: /start practice/i }).first(),
      practiceCard.getByRole("link", { name: /resume practice/i }).first(),
      practiceCard.getByRole("link", { name: /review practice/i }).first(),
      practiceCard.getByRole("link", { name: /open summary/i }).first(),
      practiceCard.getByRole("link", { name: /view practice detail|view detail/i }).first(),
    ];

    const primaryAction = await Promise.all(
      primaryActionCandidates.map(async (locator) =>
        (await locator.isVisible().catch(() => false)) ? locator : null,
      ),
    ).then((matches) => matches.find(Boolean));

    if (!primaryAction) {
      await expect(practiceCard.locator(".studentAttemptsNotice, .studentResultHelper").first()).toBeVisible();
      return;
    }

    await primaryAction.click();
    await expect(page).toHaveURL(
      /\/app\/(attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+)(?:\?.*)?$/,
    );
  });
});
