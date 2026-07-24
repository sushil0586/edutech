import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { InstituteDashboardPage } from "../page-objects/institute/institute-dashboard.po";
import { InstituteExamsPage } from "../page-objects/institute/institute-exams.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";
import { InstituteShellPage } from "../page-objects/institute/institute-shell.po";

test.describe("Institute end-user browser smoke via page objects", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute end-user can move through dashboard, exams, and linked question review with page objects", async ({
    page,
  }) => {
    const shell = new InstituteShellPage(page);
    const dashboard = new InstituteDashboardPage(page);
    const exams = new InstituteExamsPage(page);
    const questionBank = new InstituteQuestionBankPage(page);

    await loginAsRole(page, "institute");
    await shell.expectWorkspace();
    await shell.expectSidebar();

    await dashboard.goto();
    await dashboard.expectLoaded();
    await dashboard.applyFocus("assessments", "title");
    await expect(page).toHaveURL(/focus=assessments/);
    await expect(page).toHaveURL(/sort=title/);

    await shell.openSidebarRoute(/exams/i, /\/institute\/exams(?:\?.*)?$/);
    await exams.expectLoaded();
    const appliedExamFilters = await exams.applyStatusSortAndGroup("scheduled", "title", "status");
    if (appliedExamFilters) {
      await expect(page).toHaveURL(/exam_status=scheduled/);
      await expect(page).toHaveURL(/exam_sort=title/);
      await expect(page).toHaveURL(/exam_group=status/);
      await exams.resetFilters();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
    }

    await shell.openSidebarRoute(/question bank/i, /\/institute\/question-bank(?:\?.*)?$/);
    await questionBank.expectLoaded();
    await questionBank.search("acid");
    await expect(page).toHaveURL(/search=acid/);

    await questionBank.gotoLinked();
    await questionBank.expectLinkedLoaded();
    await expect(page.getByRole("link", { name: /open shared library/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open local question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/linked licensed copy|linked licensed copies/i).first()).toBeVisible();
    await expect(page.getByText(/bulk tools are hidden in linked review mode/i).first()).toBeVisible();
  });
});
