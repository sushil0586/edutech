import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectStudentExamsWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /mock tests|tests/i }).first()).toBeVisible();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }
  }

  throw new Error("Expected at least one visible locator.");
}

async function expectQuickExamControls(page: Page) {
  const quickTabs = page.locator(".studentAttemptsQuickBar").first();
  if (await quickTabs.isVisible().catch(() => false)) {
    await expect(quickTabs.getByRole("link", { name: /^all/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /resume/i }).first()).toBeVisible();
    await expect(quickTabs.getByRole("link", { name: /locked/i }).first()).toBeVisible();
    return;
  }

  await expect(page.getByText(/quick filters/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^all$/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /ready now/i }).first()).toBeVisible();
}

test.describe("Student exams workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate compact exams workspace actions and filters", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/exams");
    await expectStudentExamsWorkspace(page);

    const filtersCard = page.locator("section.studentWorkspaceFiltersCard").first();
    if (!(await filtersCard.isVisible().catch(() => false))) {
      await expect(page.getByText(/mock-test workspace is empty right now|no mock tests match/i).first()).toBeVisible();
      return;
    }

    await expectQuickExamControls(page);

    const examsForm = filtersCard.locator("form.studentWorkspaceFiltersForm").first();
    await examsForm.locator('select[name="exam_availability"]').selectOption("locked");
    await examsForm.locator('select[name="exam_sort"]').selectOption("duration_short");
    await examsForm.locator('select[name="exam_group"]').selectOption("availability");
    await examsForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_availability=locked/);
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_sort=duration_short/);
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_group=availability/);

    const noMatchState = page.getByText(/no mock tests match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset mock-test filters/i }).first().click();
      await expectStudentExamsWorkspace(page);
      return;
    }

    await page.getByRole("link", { name: /ready now/i }).first().click();
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_availability=ready/);

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectStudentExamsWorkspace(page);

    const examCard = await firstVisible([
      page.locator("article.studentExamCompactCard").first(),
      page.locator("article.studentResultSurface").first(),
    ]);
    await expect(examCard).toBeVisible();
    await expect(
      await firstVisible([
        examCard.locator(".studentAttemptsCardTitle strong").first(),
        examCard.locator(".studentResultSurfaceHead strong").first(),
      ]),
    ).toBeVisible();

    const primaryAction = await firstVisible([
      examCard.getByRole("button", { name: /unlock with .* stars/i }).first(),
      examCard.getByRole("link", { name: /resume|start|open review|open summary/i }).first(),
      examCard.getByRole("link", { name: /view full detail|detail/i }).first(),
    ]);

    await primaryAction.click();
    await expect(page).toHaveURL(
      /\/app\/(wallet|attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+)(?:\?.*)?$/,
    );
  });
});
