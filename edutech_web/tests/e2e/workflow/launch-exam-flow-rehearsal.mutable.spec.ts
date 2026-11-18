import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import {
  assignStudentToExam,
  clearExamEconomyAccessPolicy,
  createInstituteFamilyExam,
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
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableLaunchRehearsalEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_REHEARSAL_ACTIONS",
);

const backendRoot = path.resolve(process.cwd(), "../edutech_backend");
const pythonExecutable = path.join(backendRoot, ".venv", "bin", "python");
const managePyPath = path.join(backendRoot, "manage.py");

const neetDemoScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "neet_mock")!;
const jeeScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "jee_mains_math")!;
const greScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "gre_quant")!;
const awsScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner")!;
const ieltsScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "ielts_academic")!;
const pteScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "pte_academic")!;

const neetFoundationCredentials: DirectLoginCredentials = {
  username: process.env.PLAYWRIGHT_NEET_STUDENT_USERNAME ?? "demo-neet-student",
  password: process.env.PLAYWRIGHT_NEET_STUDENT_PASSWORD ?? "Demo@12345",
};

const neetFoundationScenario = {
  ...neetDemoScenario,
  programLabel: "NEET 2026 Foundation",
  subjectLabel: "Biology",
  studentCredentials: neetFoundationCredentials,
};

const rehearsalScenarios = [
  { label: "NEET demo objective mock", scenario: neetDemoScenario, questionCount: 20 },
  { label: "JEE mathematics objective mock", scenario: jeeScenario, questionCount: 30 },
  { label: "GRE quant drill", scenario: greScenario, questionCount: 40 },
  { label: "AWS certification practice", scenario: awsScenario, questionCount: 50 },
  { label: "IELTS academic language check", scenario: ieltsScenario, questionCount: 20 },
  { label: "PTE academic language check", scenario: pteScenario, questionCount: 30 },
  { label: "NEET foundation biology mock", scenario: neetFoundationScenario, questionCount: 40 },
  { label: "JEE mathematics launch stress", scenario: jeeScenario, questionCount: 50 },
  { label: "GRE quant compact retest", scenario: greScenario, questionCount: 20 },
  { label: "AWS certification compact retest", scenario: awsScenario, questionCount: 30 },
] as const;

function runManagePyCommand(args: string[]) {
  execFileSync(pythonExecutable, [managePyPath, ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
  });
}

function resultRowByTitle(page: Page, title: string) {
  return page
    .locator(".studentResultsTableRow")
    .filter({
      has: page.locator("td strong", { hasText: title }),
    })
    .first();
}

async function expectAttemptQuestionCount(page: Page, questionCount: number) {
  await expect
    .poll(
      async () => page.locator(".attemptQuestionNavChip").count(),
      { timeout: 30000 },
    )
    .toBe(questionCount);
}

async function answerEveryQuestionAndSubmit(
  page: Page,
  questionCount: number,
  seed: number,
  examTitle: string,
) {
  await expectAttemptQuestionCount(page, questionCount);

  for (let index = 0; index < questionCount; index += 1) {
    await expect(page.locator(".attemptQuestionCard").first()).toBeVisible({ timeout: 30000 });
    await answerCurrentAttemptQuestion(page, seed + index, `Launch rehearsal answer ${index + 1}`);

    const saveNextButton = page.getByRole("button", {
      name: index === questionCount - 1 ? /^Save & Review$/i : /^Save & Next$/i,
    });
    await expect(saveNextButton).toBeVisible({ timeout: 30000 });
    await saveNextButton.click();

    if (index < questionCount - 1) {
      await expect(page.locator(".attemptQuestionHeader strong").first()).toHaveText(
        new RegExp(`Question\\s+${index + 2}`, "i"),
        { timeout: 30000 },
      );
    } else {
      await expect(page.getByRole("button", { name: /^End Test$/i })).toBeVisible({ timeout: 30000 });
    }
  }

  await expect
    .poll(
      async () => {
        const answeredText = await page
          .locator(".attemptStatusTileSaved strong")
          .first()
          .textContent()
          .catch(() => "");
        return Number(answeredText?.trim() ?? "0");
      },
      { timeout: 30000 },
    )
    .toBe(questionCount);

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^End Test$/i }).click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\/summary|\?question=[^#]+)(?:\?.*)?$/, {
    timeout: 30000,
  });
  await expect(page.getByText(/submitted|attempt auto-submitted/i).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole("heading", { name: new RegExp(`${escapeRegExp(examTitle)}\\s+Summary`, "i") }).first(),
  ).toBeVisible({ timeout: 30000 });
}

async function expectAttemptReviewQuestionCoverage(page: Page, questionCount: number) {
  const visiblePageCount = Math.min(questionCount, 10);

  await expect(page.getByText(`All (${questionCount})`).first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".attemptQuestionCard")).toHaveCount(visiblePageCount);
  await expect(
    page.getByText(
      new RegExp(`Showing\\s+1-${visiblePageCount}\\s+of\\s+${questionCount}\\s+questions`, "i"),
    ),
  ).toBeVisible({ timeout: 30000 });

  if (questionCount > visiblePageCount) {
    await expect(page.getByRole("link", { name: /next page/i }).first()).toBeVisible();
  }
}

test.describe("Launch exam flow rehearsal", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are required.");

  test.skip(
    !mutableLaunchRehearsalEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_REHEARSAL_ACTIONS",
      "10-exam browser launch rehearsal coverage",
    ),
  );

  test.beforeAll(() => {
    runManagePyCommand(["prepare_demo_playwright_auth"]);
    runManagePyCommand(["seed_demo_exam_family_scope"]);
    runManagePyCommand(["seed_demo_neet_suite"]);
    runManagePyCommand(["seed_demo_jee_suite"]);
    runManagePyCommand(["seed_demo_gre_suite"]);
    runManagePyCommand(["seed_demo_aws_suite"]);
    runManagePyCommand(["seed_playwright_exam_rehearsal_bank", "--target-count", "60"]);
  });

  for (const [scenarioIndex, rehearsal] of rehearsalScenarios.entries()) {
    test(`@workflow @mutable launch rehearsal creates and completes ${rehearsal.questionCount}-question ${rehearsal.label}`, async ({
      page,
    }) => {
      test.setTimeout(900000);

      let examId: string | null = null;
      const uniqueSeed = Date.now() + scenarioIndex;
      const studentTarget = await resolveStudentAttemptTarget(page, rehearsal.scenario.studentCredentials);

      try {
        const created = await createInstituteFamilyExam(page, rehearsal.scenario, uniqueSeed, {
          sectionCount: 1,
          questionCountPerSection: rehearsal.questionCount,
          titlePrefix: "PW Launch Rehearsal",
          codePrefix: "PWLR",
        });
        examId = created.examId;

        await assignStudentToExam(page, examId, studentTarget.studentProfileId);
        await scheduleAndPublishExam(page, examId);
        await clearExamEconomyAccessPolicy(page, examId);

        const attemptId = await startExamAttemptAsStudent(
          page,
          examId,
          created.examTitle,
          rehearsal.scenario.familyLabel,
          rehearsal.scenario.studentCredentials,
        );
        await answerEveryQuestionAndSubmit(page, rehearsal.questionCount, uniqueSeed, created.examTitle);

        await loginAsFamilyInstitute(page);
        await expectInstituteWorkspace(page);
        await markExamCompleted(page, examId);
        await publishExamResultsWorkflow(page, examId);

        await loginWithCredentials(page, rehearsal.scenario.studentCredentials, "student");
        await page.goto("/app/results");
        await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

        const resultRow = resultRowByTitle(page, created.examTitle);
        await expect(resultRow).toBeVisible({ timeout: 30000 });
        await expect(resultRow.getByText(/^Available$/i).first()).toBeVisible();
        await resultRow.click();

        const resultDialog = page.getByRole("dialog").filter({
          has: page.getByText(created.examTitle),
        });
        await expect(resultDialog).toBeVisible({ timeout: 30000 });
        const reviewLink = resultDialog.getByRole("link", { name: /open answer review/i }).first();
        await expect(reviewLink).toBeVisible();
        await expect(reviewLink).toHaveAttribute(
          "href",
          new RegExp(`/app/attempts/${escapeRegExp(attemptId)}/review`),
        );
        await reviewLink.click();

        await expect(page).toHaveURL(new RegExp(`/app/attempts/${escapeRegExp(attemptId)}/review`), {
          timeout: 30000,
        });
        await expect(
          page.getByRole("heading", {
            name: new RegExp(`${escapeRegExp(created.examTitle)}\\s+Review`, "i"),
          }).first(),
        ).toBeVisible({ timeout: 30000 });
        await expectAttemptReviewQuestionCoverage(page, rehearsal.questionCount);
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
