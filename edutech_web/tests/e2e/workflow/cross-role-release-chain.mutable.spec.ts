import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createTeacherFamilyExamDirectly,
  deleteInstituteExamDirectly,
  escapeRegExp,
  familyRuntimeScenarios,
  loginAsFamilyInstitute,
  markExamCompleted,
  publishExamResultsWorkflow,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);
const mutableTeacherResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);

const crossRoleScenario =
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "neet_mock") ??
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner") ??
  familyRuntimeScenarios[0]!;

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

function teacherResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

function instituteResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

function adminExamReadinessCard(page: Page, title: RegExp) {
  return page.locator("article.dashboardPanel").filter({
    has: page.getByText(title),
  }).first();
}

test.describe("Cross-role release chain", () => {
  test.skip(
    testRequiresRole("teacher") ||
      testRequiresRole("student") ||
      testRequiresRole("admin") ||
      testRequiresRole("institute"),
    "Teacher, student, admin, and institute Playwright credentials are required.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled ||
      !mutableStudentAttemptActionsEnabled ||
      !mutableTeacherResultsActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1, PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1, and PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 for cross-role release coverage.",
  );

  test("@workflow @mutable teacher institute admin and student preserve one release chain end to end", async ({
    page,
  }) => {
    test.setTimeout(300000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(page, crossRoleScenario.studentCredentials);

    try {
      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const created = await createTeacherFamilyExamDirectly(page, crossRoleScenario, uniqueSeed, {
        titlePrefix: "PW Cross Role Release",
        codePrefix: "PWCRR",
      });
      examId = created.examId;

      await assignStudentToExam(page, examId, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);
      await clearExamEconomyAccessPolicy(page, examId);

      const attemptId = await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        crossRoleScenario.familyLabel,
        crossRoleScenario.studentCredentials,
      );
      await answerAndSubmitCurrentAttempt(
        page,
        uniqueSeed,
        `${crossRoleScenario.presetId} cross-role release`,
        created.examTitle,
      );

      await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/0 published/i);

      await markExamCompleted(page, examId);
      await publishExamResultsWorkflow(page, examId);

      await page.goto(`/teacher/results?exam=${examId}`);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/ready/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);

      await page.goto(`/teacher/results/leaderboard?exam=${examId}`);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentTarget.displayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();

      await loginAsFamilyInstitute(page);
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/ready/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);

      await page.goto(`/institute/results/leaderboard?exam=${examId}`);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentTarget.displayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);
      await page.goto(`/admin/exams/${examId}`);
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
      ).toBeVisible();
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/ready/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 generated/i);
      await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 published/i);
      await expect(page.getByText(/^published$/i).first()).toBeVisible();

      await loginWithCredentials(page, crossRoleScenario.studentCredentials, "student");
      await page.goto(`/app/attempts/${attemptId}/summary`);
      await expect(page.getByText(/review ready/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

      await page.goto("/app/results");
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      const resultCard = resultCardByTitle(page, created.examTitle);
      if (await resultCard.isVisible().catch(() => false)) {
        await expect(resultCard).toBeVisible();
        await expect(resultCard.getByText(/result published/i).first()).toBeVisible();
        await expect(resultCard.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();
      } else {
        await expect(
          page.getByText(/result published|review ready|published/i).first(),
        ).toBeVisible();
      }

      await page.goto(`/app/attempts/${attemptId}/review`);
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
      await expect(
        page.getByRole("heading", {
          name: new RegExp(`${escapeRegExp(created.examTitle)}\\s+Review`, "i"),
        }).first(),
      ).toBeVisible();
      await expect(page.getByText(/review mode/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
    }
  });
});
