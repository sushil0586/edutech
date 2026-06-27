import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createInstituteFamilyExam,
  deleteInstituteExamDirectly,
  familyRuntimeScenarios,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
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

test.describe("Institute family release-state contracts", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are required.");

  test.skip(
    !mutableExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for family release-state coverage.",
  );

  for (const scenario of competitiveReleaseScenarios) {
    test(`@workflow @mutable ${scenario.presetId} competitive family stays summary-only until publication`, async ({
      page,
    }) => {
      test.setTimeout(240000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentTarget = await resolveStudentAttemptTarget(page, scenario.studentCredentials);

      try {
        const created = await createInstituteFamilyExam(page, scenario, uniqueSeed, {
          titlePrefix: "PW Family Release",
          codePrefix: "PWFRL",
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
          `${scenario.presetId} release`,
          created.examTitle,
        );

        await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
        await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
        await expect(page.getByText(/review locked/i).first()).toBeVisible();
        await expect(page.getByText(/scoring is hidden until result visibility rules are met\./i)).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);

        await page.getByRole("link", { name: /check result status|open results/i }).first().click();
        await expect(page).toHaveURL(/\/app\/results(?:\?.*)?$/);
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
        await expect(page.getByText(/0 results loaded/i).first()).toBeVisible();
        await expect(page.getByText(/your result history is empty right now/i).first()).toBeVisible();
        await expect(page.getByText(/once submitted attempts are processed and visible to the learner/i).first()).toBeVisible();
        await expect(resultCardByTitle(page, created.examTitle)).toHaveCount(0);

        await page.goto(`/app/attempts/${attemptId}/review`);
        await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
        await expect(page.getByRole("heading", { name: /attempt review/i }).first()).toBeVisible();
        await expect(page.getByText(/attempt review is not available right now/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();
      } finally {
        if (examId) {
          await loginAsRole(page, "institute");
          await expectInstituteWorkspace(page);
          await deleteInstituteExamDirectly(page, examId);
        }
      }
    });
  }
});
