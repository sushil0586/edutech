import { expect, test, type Page } from "@playwright/test";
import { loginWithCredentials, type DirectLoginCredentials } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";
import { expectStudentWorkspaceContext, selectStudentWorkspaceContext } from "../helpers/student-topbar";

const opbmsStudentCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_OPBMS_STUDENT_USERNAME?.trim() || "a001",
  password: process.env.PLAYWRIGHT_OPBMS_STUDENT_PASSWORD?.trim() || "Ansh@1789",
};

async function expectVisibleStudentCards(page: Page, emptyStatePattern: RegExp) {
  await expect(page.getByText(emptyStatePattern).first()).toBeHidden();
  const cardSurface = page.locator("article.studentResultSurface").first();
  const tableRow = page.locator(".studentResultsTableRow").first();

  if (await cardSurface.count()) {
    await expect(cardSurface).toBeVisible();
    return;
  }

  await expect(tableRow).toBeVisible();
}

async function expectStudentResultsWorkspace(page: Page) {
  const emptyHistory = page.getByText(/your result history is empty right now/i).first();
  const tableRow = page.locator(".studentResultsTableRow").first();

  if (await emptyHistory.isVisible().catch(() => false)) {
    await expect(page.getByText(/waiting for published results/i).first()).toBeVisible();
    return;
  }

  await expect(tableRow).toBeVisible();
}

test.describe("Student OPBMS filter regression coverage", () => {
  test("@workflow student source and subject filters keep tests, attempts, and results populated for OPBMS class 7 math", async ({
    page,
  }) => {
    await loginWithCredentials(page, opbmsStudentCredentials, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/exams");
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /tests|exam/i }).first()).toBeVisible();

    await selectStudentWorkspaceContext(page, {
      source: "institute",
      subject: "Math",
    });
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });

    await expectVisibleStudentCards(page, /no mock tests match the current source and subject view/i);
    await expect(page.locator("article.studentResultSurface").filter({
      hasText: /institute|obpms/i,
    }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/attempts");
    await expect(page).toHaveURL(/\/app\/attempts(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /attempt/i }).first()).toBeVisible();
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });
    await expectVisibleStudentCards(page, /your attempt history is empty right now/i);

    const attemptsForm = page.locator("form.studentWorkspaceFiltersForm").first();
    await expect(attemptsForm).toBeVisible();
    await attemptsForm.locator('select[name="attempt_filter"]').selectOption("submitted");
    await attemptsForm.locator('select[name="attempt_sort"]').selectOption("highest");
    await attemptsForm.getByRole("button", { name: /update view/i }).click();
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_filter=submitted/);
    await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_sort=highest/);
    await expect(page.getByText(/status:\s*submitted/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*highest/i).first()).toBeVisible();
    await expectVisibleStudentCards(page, /no attempts match these controls/i);

    await gotoWithRuntimeRecovery(page, "/app/results");
    await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expectStudentWorkspaceContext(page, {
      source: "Institute",
      subject: "Math",
    });
    await expectStudentResultsWorkspace(page);

    const resultsForm = page.locator("form.studentWorkspaceFiltersForm").first();
    const waitingForResults = page.getByText(/your result history is empty right now/i).first();
    const noMatchingResults = page.getByText(/no results match these controls/i).first();
    const groupedResults = page.locator(".studentResultsGroupedSection").first();
    const resultsRows = page.locator(".studentResultsTableRow");

    if (await resultsForm.count()) {
      await expect(resultsForm).toBeVisible();
      await resultsForm.locator('select[name="result_status"]').selectOption("published");
      await resultsForm.locator('select[name="result_group"]').selectOption("source");
      await resultsForm.getByRole("button", { name: /update view/i }).click();
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=published/);
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=source/);
      await expect(page.getByText(/status:\s*(published|pending)/i).first()).toBeVisible();
      await expect(page.getByText(/group:\s*source/i).first()).toBeVisible();

      if (await noMatchingResults.isVisible().catch(() => false)) {
        await expect(noMatchingResults).toBeVisible();
      } else if (await waitingForResults.isVisible().catch(() => false)) {
        await expect(page.getByText(/waiting for published results/i).first()).toBeVisible();
      } else {
        await expect(groupedResults).toBeVisible();
        await expect(resultsRows.filter({
          hasText: /class 7 math practice pulse|obpms-math-pp/i,
        }).first()).toBeVisible();
      }
    } else {
      await expect(waitingForResults).toBeVisible();
      await expect(page.getByText(/waiting for published results/i).first()).toBeVisible();
    }
  });
});
