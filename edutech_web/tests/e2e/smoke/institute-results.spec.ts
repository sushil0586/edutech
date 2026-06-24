import { test, expect } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute smoke journeys", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@smoke institute can move through dashboard, people, academic setup, exams, exam detail, builder, assignments, results, leaderboard, and reviews", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/dashboard");
    await expect(page.getByText(/institute control/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /open people/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open academic setup/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open reviews/i }).first()).toBeVisible();
    await page.getByLabel(/focus/i).selectOption("assessments");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/focus=assessments/);
    await expect(page.getByText(/focus: assessments/i)).toBeVisible();
    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).not.toHaveURL(/focus=assessments/);

    await page.getByRole("link", { name: /open people/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/people/);
    await expect(page.getByRole("heading", { name: /people/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^students$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^teachers$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /academic setup/i }).last()).toBeVisible();
    await expect(page.getByLabel(/search roster/i)).toBeVisible();
    await expect(page.getByLabel(/filter login status/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create student/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import students/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reset password/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /disable login/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /^teachers$/i }).click();
    await expect(page).toHaveURL(/view=teachers/);
    await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create teacher/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /import teachers/i })).toBeVisible();
    await page.getByRole("link", { name: /^students$/i }).click();
    await expect(page).toHaveURL(/view=students/);

    await page.goto("/institute/academic-setup");
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
    const setupTeacherAssignmentsLink = page.getByRole("link", { name: /^assignments$/i }).first();
    await expect(setupTeacherAssignmentsLink).toBeVisible();
    await setupTeacherAssignmentsLink.click();
    await expect(page).toHaveURL(/\/institute\/academic-setup\?section=teacher-assignments/);
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
    await page.getByRole("link", { name: /exam defaults/i }).first().click();
    await expect(page).toHaveURL(/section=exam-defaults/);
    await page.getByRole("link", { name: /academic years/i }).first().click();
    await expect(page).toHaveURL(/section=academic-years/);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /quick create/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /advanced builder/i })).toBeVisible();

    const openExamLink = page.getByRole("link", { name: /open exam/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+$/);
    const examDetailUrl = page.url();
    await expect(page.getByText("Exam Code", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Assigned Students", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Exam Access Key", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Result Status", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /back to exams/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /link questions/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i })).toBeVisible();
    await page.getByRole("link", { name: /back to exams/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams$/);
    await page.goto(examDetailUrl);
    await expect(page.getByRole("button", { name: /refresh status/i })).toBeVisible();
    await page.getByRole("button", { name: /refresh status/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
    await page.goto(examDetailUrl);
    await expect(page.getByRole("button", { name: /sync marks/i })).toBeVisible();
    await page.getByRole("button", { name: /sync marks/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
    await page.goto(examDetailUrl);
    await page.getByRole("link", { name: /link questions/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder\?tab=questions/);
    await expect(page.getByRole("link", { name: /open delivery view/i })).toBeVisible();
    await page.getByRole("link", { name: /open delivery view/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+$/);
    await page.getByRole("link", { name: /open builder/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open delivery view/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /linked questions/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open delivery view/i }).click();
    await expect(page).toHaveURL(/\/institute\/exams\/.+$/);

    await page.goto("/institute/teacher-assignments");
    await expect(page.getByRole("heading", { name: /teacher assignments/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByRole("heading", { name: /add teacher assignment/i })).toBeVisible();
    await page.getByRole("button", { name: /create assignment/i }).click();
    const assignmentDialog = page.getByRole("dialog");
    await expect(assignmentDialog.getByText(/fill the required fields to continue/i)).toBeVisible();
    await expect(assignmentDialog.getByText(/teacher is required/i)).toBeVisible();
    await expect(assignmentDialog.getByText(/academic year is required/i)).toBeVisible();
    await expect(assignmentDialog.getByText(/program is required/i)).toBeVisible();
    await expect(assignmentDialog.getByText(/subject is required/i)).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
    const editAssignmentButton = page.getByRole("button", { name: /edit/i }).first();
    await expect(editAssignmentButton).toBeVisible();
    await editAssignmentButton.click();
    await expect(page.getByRole("heading", { name: /edit teacher assignment/i })).toBeVisible();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("button", { name: /update assignment/i })).toBeVisible();
    await expect(editDialog.getByRole("combobox", { name: /^teacher$/i })).not.toHaveValue("");
    await expect(editDialog.getByRole("combobox", { name: /^academic year$/i })).not.toHaveValue("");
    await expect(editDialog.getByRole("combobox", { name: /^program$/i })).not.toHaveValue("");
    await expect(editDialog.getByRole("combobox", { name: /^subject$/i })).not.toHaveValue("");
    await editDialog.getByRole("button", { name: /cancel|close/i }).last().click();

    await page.goto("/institute/results");
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/workflow|readiness|exam health/i).first()).toBeVisible();

    await page.goto("/institute/results/analysis");
    await expect(page.getByText(/analytics flow/i)).toBeVisible();
    await expect(page.getByText(/question risk board/i)).toBeVisible();
    await expect(page.getByText("Student explorer", { exact: true })).toBeVisible();
    await page.getByLabel(/group by/i).selectOption("status");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/exam_list_group=status/);
    await expect(page.getByText(/group: status/i)).toBeVisible();

    const leaderboardLink = page.getByRole("link", {
      name: /leaderboard.*ranks, publication state, and top outcomes/i,
    });
    await expect(leaderboardLink).toBeVisible();
    await leaderboardLink.click();
    await expect(page).toHaveURL(/\/institute\/results\/leaderboard/);
    await expect(page.getByText("Leaderboard", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/publication checklist/i)).toBeVisible();
    await expect(page.getByText(/waiting for submissions/i)).toBeVisible();

    await page.goto("/institute/security");
    await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();
    await expect(page.getByLabel(/group attempts/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /group by health/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^watching$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();
    await page.getByRole("link", { name: /group by health/i }).click();
    await expect(page).toHaveURL(/attempt_group=health/);
    await expect(page.getByText(/group: health/i)).toBeVisible();
    await expect(page.getByText(/integrity watchlist/i)).toBeVisible();
    await page.getByRole("link", { name: /reset filters/i }).click();
    await expect(page).not.toHaveURL(/attempt_group=health/);
    await expect(page.getByText(/group: none/i)).toBeVisible();

    await page.goto("/institute/reviews");
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage/i)).toBeVisible();
    const viewPendingLink = page.getByRole("link", { name: /view pending/i }).first();
    await expect(viewPendingLink).toBeVisible();
    await viewPendingLink.click();
    await expect(page).toHaveURL(/status=pending/);
    await page.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).not.toHaveURL(/status=pending/);
  });
});
