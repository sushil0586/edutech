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

async function findPrimaryExamAction(examCard: Locator) {
  return firstVisible([
    examCard.getByRole("button", { name: /unlock with .* stars/i }).first(),
    examCard.getByRole("link", { name: /resume test|start test|open review|open summary|view details/i }).first(),
  ]);
}

test.describe("Student exams workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate compact exams workspace actions filters grouping and paging", async ({
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
    await expect(examsForm.locator('select[name="exam_page_size"]')).toBeVisible();
    await examsForm.locator('select[name="exam_availability"]').selectOption("locked");
    await examsForm.locator('select[name="exam_sort"]').selectOption("duration_short");
    await examsForm.locator('select[name="exam_group"]').selectOption("availability");
    await examsForm.locator('select[name="exam_page_size"]').selectOption("6");
    await examsForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_availability=locked/);
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_sort=duration_short/);
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_group=availability/);
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_page_size=6/);
    await expect(page.getByText(/page size:\s*6/i).first()).toBeVisible();

    const paginationSummary = page.locator(".studentCatalogPaginationSummary").first();
    if (await paginationSummary.isVisible().catch(() => false)) {
      await expect(paginationSummary).toContainText(/page \d+ of \d+/i);
      await expect(paginationSummary).toContainText(/showing \d+-\d+ of \d+ mock tests/i);
    }

    const noMatchState = page.getByText(/no mock tests match these controls/i).first();
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset mock-test filters/i }).first().click();
      await expectStudentExamsWorkspace(page);
      return;
    }

    await page.getByRole("link", { name: /ready now/i }).first().click();
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_availability=ready/);
    await expect(page.getByRole("link", { name: /ready now/i }).first()).toHaveClass(/studentAttemptsQuickTabActive|studentWorkspaceQuickChipActive/);

    await page.getByRole("link", { name: /group by availability/i }).first().click();
    await expect(page).toHaveURL(/\/app\/exams\?[^#]*exam_group=availability/);

    const groupedHeading = page.locator(".sectionHeadingCompact").first();
    if (await groupedHeading.isVisible().catch(() => false)) {
      await expect(groupedHeading).toContainText(/mock tests/i);
    }

    await page.getByRole("link", { name: /reset filters/i }).first().click();
    await expectStudentExamsWorkspace(page);
    await expect(page.getByText(/availability:\s*all/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*recommended/i).first()).toBeVisible();

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
    await expect(examCard.locator(".studentAttemptsNotice").first()).toBeVisible();

    const primaryAction = await findPrimaryExamAction(examCard);
    const actionName = (await primaryAction.textContent())?.trim() ?? "";

    if (/unlock with/i.test(actionName)) {
      await expect(examCard.getByRole("link", { name: /open wallet/i }).first()).toBeVisible();
    } else {
      await expect(primaryAction).toHaveAttribute("href", /\/app\/(attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+)/);
    }

    await primaryAction.click();
    await expect(page).toHaveURL(
      /\/app\/(wallet|attempts\/[^/]+(?:\/review|\/summary)?|exams\/[^/?#]+)(?:\?.*)?$/,
    );

    await gotoWithRuntimeRecovery(page, "/app/exams");
    await expectStudentExamsWorkspace(page);
    const detailAction = page.getByRole("link", { name: /view details/i }).first();
    if (await detailAction.isVisible().catch(() => false)) {
      await detailAction.click();
      await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    }
  });
});
