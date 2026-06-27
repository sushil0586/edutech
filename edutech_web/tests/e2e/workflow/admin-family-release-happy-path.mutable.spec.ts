import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createAdminFamilyExam,
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
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

const competitiveReleaseScenarios = familyRuntimeScenarios.filter(
  (scenario) =>
    scenario.presetId === "neet_mock" ||
    scenario.presetId === "jee_mains_math" ||
    scenario.presetId === "gre_quant",
);

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

test.describe("Admin family release happy path", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are required.");

  test.skip(
    !mutableAdminExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for admin family release coverage.",
  );

  for (const scenario of competitiveReleaseScenarios) {
    test(`@workflow @mutable ${scenario.presetId} admin family unlocks results and review after admin release`, async ({
      page,
    }) => {
      test.setTimeout(300000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentTarget = await resolveStudentAttemptTarget(page, scenario.studentCredentials);

      try {
        const created = await createAdminFamilyExam(page, scenario, uniqueSeed, {
          titlePrefix: "PW Admin Release Ready",
          codePrefix: "PWARR",
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
          `${scenario.presetId} admin release ready`,
          created.examTitle,
        );

        await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);

        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await page.goto(`/admin/exams/${examId}`);
        await expect(
          page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first(),
        ).toBeVisible();
        await expect(adminExamReadinessCard(page, /^exam publish readiness$/i)).toContainText(/blocked/i);
        await expect(adminExamReadinessCard(page, /^exam publish readiness$/i)).toContainText(/invalid status/i);
        await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/review first/i);
        await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/0 generated/i);

        await markExamCompleted(page, examId);
        await publishExamResultsWorkflow(page, examId);

        await page.goto(`/admin/exams/${examId}`);
        await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/ready/i);
        await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 generated/i);
        await expect(adminExamReadinessCard(page, /^result publish readiness$/i)).toContainText(/1 published/i);
        await expect(page.getByText(/^published$/i).first()).toBeVisible();

        await loginWithCredentials(page, scenario.studentCredentials, "student");
        await page.goto(`/app/attempts/${attemptId}/summary`);
        await expect(page.getByText(/review ready/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

        await page.goto("/app/results");
        const resultCard = resultCardByTitle(page, created.examTitle);
        await expect(resultCard).toBeVisible();
        await expect(resultCard.getByText(/result published/i).first()).toBeVisible();

        await page.goto(`/app/attempts/${attemptId}/review`);
        await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
        await expect(
          page.getByRole("heading", {
            name: new RegExp(`${created.examTitle}\\s+Review`, "i"),
          }).first(),
        ).toBeVisible();
      } finally {
        if (examId) {
          await loginAsRole(page, "admin");
          await expectAdminWorkspace(page);
          await deleteInstituteExamDirectly(page, examId);
        }
      }
    });
  }
});
