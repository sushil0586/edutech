import { expect, test, type Page } from "@playwright/test";
import { loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import {
  answerAndSubmitCurrentAttempt,
  assignStudentToExam,
  calculateExamRanks,
  clearExamEconomyAccessPolicy,
  createInstituteFamilyExam,
  deleteInstituteExamDirectly,
  escapeRegExp,
  familyRuntimeScenarios,
  markExamCompleted,
  resolveStudentAttemptTarget,
  scheduleAndPublishExam,
  startExamAttemptAsStudent,
  loginAsFamilyInstitute,
} from "../helpers/family-runtime";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);
const backendBaseUrl = resolveBackendBaseUrl();

const awsScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner")!;

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

function instituteResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
}

async function fetchStudentResultsForExam(page: Page, examId: string) {
  const accessToken = (await page.context().cookies()).find(
    (cookie) => cookie.name === "nexora_access_token",
  )?.value?.trim();
  expect(accessToken).toBeTruthy();
  const response = await page.request.get(`${backendBaseUrl}/api/v1/results/?exam=${examId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as {
    count?: number;
    results?: Array<{
      exam_title?: string;
      is_published?: boolean;
    }>;
  };
}

test.describe("Institute family immediate release", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are required.");

  test.skip(
    !mutableExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for family immediate-release coverage.",
  );

  test("@workflow @mutable aws certification family publishes learner results immediately and becomes leaderboard-ready after completion", async ({
    page,
  }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(page, awsScenario.studentCredentials);

    try {
      const created = await createInstituteFamilyExam(page, awsScenario, uniqueSeed, {
        sectionCount: 1,
        questionCountPerSection: 1,
        titlePrefix: "PW Family Immediate",
        codePrefix: "PWFI",
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
      await answerAndSubmitCurrentAttempt(page, uniqueSeed, "aws immediate", created.examTitle);

      await expect(page.getByText(/review feedback/i).first()).toBeVisible();
      await expect(page.getByText(/instant feedback ready/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();

      await loginAsFamilyInstitute(page);
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/complete the exam before publishing results/i);

      await markExamCompleted(page, examId);
      await calculateExamRanks(page, examId);

      await page.goto(`/institute/results?exam=${examId}`);
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
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentTarget.displayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();

      await loginWithCredentials(page, awsScenario.studentCredentials, "student");
      await page.goto("/app/results");
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect
        .poll(
          async () => {
            const payload = await fetchStudentResultsForExam(page, examId!);
            return (payload.results ?? []).some(
              (row) =>
                row.is_published &&
                (row.exam_title ?? "").toLowerCase().includes(created.examTitle.toLowerCase()),
            );
          },
          { timeout: 30000 },
        )
        .toBe(true);
      await expect(page.getByText(/result published|published/i).first()).toBeVisible();

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
        await loginAsFamilyInstitute(page);
        await expectInstituteWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
    }
  });
});
