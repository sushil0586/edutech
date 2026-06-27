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
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);
const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

test.describe("Institute family runtime smoke", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are required.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled || !mutableStudentAttemptActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS=1 and PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS=1 for family runtime smoke coverage.",
  );

  for (const scenario of familyRuntimeScenarios) {
    test(`@workflow @mutable ${scenario.presetId} family exam can be created, assigned, started, and submitted`, async ({
      page,
    }) => {
      test.setTimeout(240000);

      let examId: string | null = null;
      const uniqueSeed = Date.now();
      const studentTarget = await resolveStudentAttemptTarget(page, scenario.studentCredentials);

      try {
        const created = await createInstituteFamilyExam(page, scenario, uniqueSeed);
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
        await answerAndSubmitCurrentAttempt(
          page,
          uniqueSeed,
          `Family runtime ${scenario.familyLabel}`,
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
});
