import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createTeacherFamilyExam,
  deleteInstituteExamDirectly,
  escapeRegExp,
  familyRuntimeScenarios,
  markExamCompleted,
  publishExamResultsWorkflow,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);
const mutableTeacherResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);

const releaseScenarios = familyRuntimeScenarios.filter(
  (scenario) =>
    scenario.presetId === "neet_mock" ||
    scenario.presetId === "jee_mains_math" ||
    scenario.presetId === "gre_quant" ||
    scenario.presetId === "ielts_academic" ||
    scenario.presetId === "pte_academic",
);

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

test.describe("Teacher family release happy path", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are required.");

  test.skip(
    !mutableExamBuilderActionsEnabled ||
      !mutableStudentAttemptActionsEnabled ||
      !mutableTeacherResultsActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1, PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1, and PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS=1 for teacher family release coverage.",
  );

  for (const scenario of releaseScenarios) {
    test(`@workflow @mutable ${scenario.presetId} teacher family unlocks results and review after teacher release`, async ({
      page,
    }) => {
      test.setTimeout(300000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentTarget = await resolveStudentAttemptTarget(page, scenario.studentCredentials);

      try {
        const created = await createTeacherFamilyExam(page, scenario, uniqueSeed, {
          titlePrefix: "PW Teacher Release Ready",
          codePrefix: "PWTRR",
        });
        examId = created.examId;

        await assignStudentToExam(page, examId, studentTarget.studentProfileId);
        await scheduleAndPublishExam(page, examId);
        await clearExamEconomyAccessPolicy(page, examId);

        const attemptId = await startExamAttemptAsStudent(
          page,
          examId,
          created.examTitle,
          scenario.familyLabel,
          scenario.studentCredentials,
        );
        await answerAndSubmitCurrentAttempt(
          page,
          uniqueSeed,
          `${scenario.presetId} teacher release ready`,
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
          teacherResultsWorkspaceReadinessCard(page, /^exam publish readiness$/i),
        ).toContainText(/invalid status/i);
        await expect(
          teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
        ).toContainText(/blocked/i);
        await expect(
          teacherResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
        ).toContainText(/0 generated/i);

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

        if (scenario.familyLabel === "Language Proficiency") {
          await expect(page.getByText(/skill bands/i).first()).toBeVisible();
          await expect(page.getByText(/rubric evidence/i).first()).toBeVisible();
          await expect(page.getByText(/media delivery readiness/i).first()).toBeVisible();
        }

        await page.goto(`/teacher/results/leaderboard?exam=${examId}`);
        await expect(page).toHaveURL(/\/teacher\/results\/leaderboard\?[^#]*exam=/);
        await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
        await expect(page.getByText(new RegExp(escapeRegExp(studentTarget.displayName), "i")).first()).toBeVisible();
        await expect(page.getByText(/rank 1/i).first()).toBeVisible();

        await loginWithCredentials(page, scenario.studentCredentials, "student");
        await page.goto(`/app/attempts/${attemptId}/summary`);
        await expect(page.getByText(/review ready/i).first()).toBeVisible();
        await expect(page.getByText(/review answers/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

        await page.goto("/app/results");
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
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
        await expect(page.getByText(/review mode/i).first()).toBeVisible();
        await expect(page.getByText(/review available/i).first()).toBeVisible();
      } finally {
        if (examId) {
          await loginAsRole(page, "teacher");
          await expectTeacherWorkspace(page);
          await deleteInstituteExamDirectly(page, examId);
        }
      }
    });
  }
});
