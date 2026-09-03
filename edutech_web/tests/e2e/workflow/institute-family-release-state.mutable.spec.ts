import { expect, test, type Page } from "@playwright/test";
import { testRequiresRole } from "../helpers/auth";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createInstituteFamilyExam,
  deleteInstituteExamDirectly,
  familyRuntimeScenarios,
  loginAsFamilyInstitute,
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
    scenario.presetId === "jee_mains_math" ||
    scenario.presetId === "gre_quant",
);

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface, .studentResultsTableRow").filter({
    has: page.locator("strong", { hasText: title }),
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

        await expect(
          page.getByRole("heading", { name: new RegExp(`${created.examTitle}\\s+Summary`, "i") }).first(),
        ).toBeVisible();
        await expect(page.getByText(/wait for publication/i).first()).toBeVisible();
        await expect(page.getByText(/review locked/i).first()).toBeVisible();
        await expect(page.getByText(/evaluation pending|results will appear after evaluation/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /open answer review/i })).toHaveCount(0);

        await page.goto("/app/results?result_status=pending");
        await expect(page).toHaveURL(/\/app\/results\?result_status=pending(?:&.*)?$/);
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
        await expect(page.getByText(/results loaded/i).first()).toBeVisible();
        const resultCard = resultCardByTitle(page, created.examTitle);
        await expect(resultCard).toBeVisible();
        await expect(resultCard).toContainText(/pending/i);
        await expect(resultCard).toContainText(/awaiting result/i);
        await expect(resultCard).toContainText(/open practice/i);

        await resultCard.click();
        const resultDialog = page.getByRole("dialog");
        await expect(resultDialog).toBeVisible();
        await expect(resultDialog.getByRole("link", { name: /open summary/i })).toBeVisible();
        await expect(resultDialog.getByRole("link", { name: /open answer review/i })).toHaveCount(0);
        await expect(resultDialog.getByRole("link", { name: /open practice/i })).toBeVisible();
        await resultDialog.getByRole("button", { name: /close/i }).click();
        await expect(resultDialog).toHaveCount(0);

        await page.goto(`/app/attempts/${attemptId}/review`);
        await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
        await expect(page.getByRole("heading", { name: /attempt review/i }).first()).toBeVisible();
        await expect(page.getByText(/attempt review is not available right now/i).first()).toBeVisible();
        await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
      } finally {
        if (examId) {
          await loginAsFamilyInstitute(page);
          await expectInstituteWorkspace(page);
          await deleteInstituteExamDirectly(page, examId);
        }
      }
    });
  }
});
