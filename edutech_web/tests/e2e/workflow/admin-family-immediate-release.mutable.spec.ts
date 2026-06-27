import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  calculateExamRanks,
  clearExamEconomyAccessPolicy,
  createAdminFamilyExam,
  deleteInstituteExamDirectly,
  escapeRegExp,
  familyRuntimeScenarios,
  markExamCompleted,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

const awsScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner")!;

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

function adminExamReadinessCard(page: Page, title: RegExp) {
  return page.locator("article.dashboardPanel").filter({
    has: page.getByText(title),
  }).first();
}

test.describe("Admin family immediate release", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are required.");

  test.skip(
    !mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family immediate-release coverage.",
  );

  test("@workflow @mutable aws certification family publishes learner results immediately and becomes admin-ready after completion", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(page, awsScenario.studentCredentials);

    try {
      const created = await createAdminFamilyExam(page, awsScenario, uniqueSeed, {
        sectionCount: 1,
        questionCountPerSection: 1,
        titlePrefix: "PW Admin Immediate",
        codePrefix: "PWAI",
      });
      examId = created.examId;

      await assignStudentToExam(page, examId, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);
      await clearExamEconomyAccessPolicy(page, examId);

      const attemptId = await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        awsScenario.familyLabel,
        awsScenario.studentCredentials,
      );
      await answerAndSubmitCurrentAttempt(page, uniqueSeed, "aws admin immediate", created.examTitle);

      await expect(page.getByText(/review feedback/i).first()).toBeVisible();
      await expect(page.getByText(/instant feedback ready/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      await page.goto(`/admin/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
      ).toBeVisible();
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/review first/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 generated/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 published/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(
        /complete the exam before publishing results/i,
      );

      await markExamCompleted(page, examId);
      await calculateExamRanks(page, examId);

      await page.goto(`/admin/exams/${examId}`);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/ready/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 generated/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 published/i);
      await expect(page.getByText(/^published$/i).first()).toBeVisible();

      await loginWithCredentials(page, awsScenario.studentCredentials, "student");
      await page.goto("/app/results");
      const resultCard = resultCardByTitle(page, created.examTitle);
      await expect(resultCard).toBeVisible();
      await expect(resultCard.getByText(/result published/i).first()).toBeVisible();
      await expect(resultCard.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

      await page.goto(`/app/attempts/${attemptId}/review`);
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
      await expect(
        page.getByRole("heading", {
          name: new RegExp(`${created.examTitle}\\s+Review`, "i"),
        }).first(),
      ).toBeVisible();
      await expect(page.getByText(/review available/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
    }
  });
});
