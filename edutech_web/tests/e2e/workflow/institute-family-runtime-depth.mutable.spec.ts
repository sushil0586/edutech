import { expect, test } from "@playwright/test";
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

const neetScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "neet_mock")!;
const awsScenario = familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner")!;
const sectionSwitchScenarios = familyRuntimeScenarios
  .filter((scenario) => scenario.presetId === "jee_mains_math" || scenario.presetId === "gre_quant")
  .map((scenario) => ({
    ...scenario,
    firstSectionName: scenario.presetId === "jee_mains_math" ? "Objective" : "Quant Section 1",
    secondSectionName: scenario.presetId === "jee_mains_math" ? "Numeric" : "Quant Section 2",
  }));

test.describe("Institute family runtime depth", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are required.");

  test.skip(
    !mutableExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for family runtime depth coverage.",
  );

  test("@workflow @mutable neet sequential family flow advances into the next section", async ({ page }) => {
    test.setTimeout(240000);

    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const studentTarget = await resolveStudentAttemptTarget(page, neetScenario.studentCredentials);

    try {
      const created = await createInstituteFamilyExam(page, neetScenario, uniqueSeed, {
        sectionCount: 2,
        questionCountPerSection: 1,
        titlePrefix: "PW Family Depth",
        codePrefix: "PWFD",
      });
      examId = created.examId;

      await assignStudentToExam(page, examId, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);
      await clearExamEconomyAccessPolicy(page, examId);

      await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        neetScenario.familyLabel,
        neetScenario.studentCredentials,
      );

      const sectionPanel = page.locator(".attemptSectionPanel").first();
      await expect(sectionPanel).toBeVisible();
      await expect(sectionPanel.getByText(/section access/i)).toBeVisible();
      await expect(sectionPanel.locator(".attemptSectionCard")).toHaveCount(2);
      await expect(sectionPanel.locator(".attemptSectionCardActive strong").first()).toHaveText(/biology/i);

      await expect(page.getByRole("button", { name: /save & next section/i })).toBeVisible();
      await page.getByRole("button", { name: /save & next section/i }).click();

      await expect(sectionPanel.locator(".attemptSectionCardActive strong").first()).toHaveText(/chemistry/i, {
        timeout: 30000,
      });
      await expect(page.getByText(/next handoff/i).first()).toBeVisible();

      await answerAndSubmitCurrentAttempt(page, uniqueSeed, "NEET depth", created.examTitle);
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
    }
  });

  for (const scenario of sectionSwitchScenarios) {
    test(`@workflow @mutable ${scenario.presetId} family runtime allows explicit section switching`, async ({
      page,
    }) => {
      test.setTimeout(240000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentTarget = await resolveStudentAttemptTarget(page, scenario.studentCredentials);

      try {
        const created = await createInstituteFamilyExam(page, scenario, uniqueSeed, {
          sectionCount: 2,
          questionCountPerSection: 1,
          titlePrefix: "PW Family Depth",
          codePrefix: "PWFD",
        });
        examId = created.examId;

        await assignStudentToExam(page, examId, studentTarget.studentProfileId);
        await scheduleAndPublishExam(page, examId);
        await clearExamEconomyAccessPolicy(page, examId);

        await startExamAttemptAsStudent(
          page,
          examId,
          created.examTitle,
          scenario.familyLabel,
          scenario.studentCredentials,
        );

        const sectionPanel = page.locator(".attemptSectionPanel").first();
        await expect(sectionPanel).toBeVisible();
        await expect(sectionPanel.locator(".attemptSectionCardActive strong").first()).toHaveText(
          new RegExp(scenario.firstSectionName, "i"),
        );

        const targetSectionCard = sectionPanel.locator(".attemptSectionCard").filter({
          has: page.getByText(new RegExp(`^${scenario.secondSectionName}$`, "i")),
        });
        await expect(targetSectionCard).toBeVisible();
        await targetSectionCard.getByRole("button", { name: /open section/i }).click();

        await expect(sectionPanel.locator(".attemptSectionCardActive strong").first()).toHaveText(
          new RegExp(scenario.secondSectionName, "i"),
          { timeout: 30000 },
        );
        await expect(page.getByText(new RegExp(scenario.secondSectionName, "i")).first()).toBeVisible();

        await answerAndSubmitCurrentAttempt(
          page,
          uniqueSeed,
          `${scenario.presetId} depth`,
          created.examTitle,
        );
      } finally {
        if (examId) {
          await loginAsRole(page, "institute");
          await expectInstituteWorkspace(page);
          await deleteInstituteExamDirectly(page, examId);
        }
      }
    });
  }

  test("@workflow @mutable aws practice family exposes immediate answer review after submit", async ({
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
        titlePrefix: "PW Family Depth",
        codePrefix: "PWFD",
      });
      examId = created.examId;

      await assignStudentToExam(page, examId, studentTarget.studentProfileId);
      await scheduleAndPublishExam(page, examId);
      await clearExamEconomyAccessPolicy(page, examId);

      await startExamAttemptAsStudent(
        page,
        examId,
        created.examTitle,
        awsScenario.familyLabel,
        awsScenario.studentCredentials,
      );
      await answerAndSubmitCurrentAttempt(page, uniqueSeed, "AWS depth", created.examTitle);

      const reviewLink = page.getByRole("link", { name: /^open answer review$/i }).first();
      await expect(reviewLink).toBeVisible();
      await reviewLink.click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/review(?:\?.*)?$/, { timeout: 30000 });
      await expect(
        page.getByRole("heading", {
          name: new RegExp(`${created.examTitle}\\s+Review`, "i"),
        }).first(),
      ).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/review available/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExamDirectly(page, examId);
      }
    }
  });
});

