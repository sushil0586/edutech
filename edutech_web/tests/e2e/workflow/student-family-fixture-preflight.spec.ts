import { expect, test } from "@playwright/test";
import {
  inspectStudentFamilyFixture,
  studentFamilyFixtureScenarios,
} from "../helpers/student-family";

test.describe("Student family fixture preflight", () => {
  for (const scenario of studentFamilyFixtureScenarios) {
    test(`@workflow preflight validates seeded ${scenario.label} student fixture availability`, async ({
      page,
    }) => {
      const status = await inspectStudentFamilyFixture(page, scenario);

      if (scenario.preflightOptional && !status.loginOk) {
        test.skip(
          true,
          `${scenario.label} is an optional family preflight on Monday, July 20, 2026 and its seeded login is not available for ${status.username}. Failure: ${status.failureReason ?? "unknown"}.`,
        );
      }

      expect(
        status.loginOk,
          `${scenario.label} login fixture is unavailable on Monday, July 20, 2026 for ${status.username}. Failure: ${status.failureReason ?? "unknown"}.`,
      ).toBe(true);

      if (scenario.preflightOptional && !status.examVisible) {
        test.skip(
          true,
          `${scenario.label} is an optional family preflight on Monday, July 20, 2026 and exam fixture ${status.examCode} is not present for ${status.username}. Visible exam codes: ${status.visibleExamCodes.join(", ") || "none"}.`,
        );
      }

      expect(
        status.examVisible,
        `${scenario.label} exam fixture ${status.examCode} is unavailable on Monday, July 20, 2026 for ${status.username}. Visible exam codes: ${status.visibleExamCodes.join(", ") || "none"}.`,
      ).toBe(true);

      if (scenario.resultExamCode) {
        expect(
          status.resultVisible,
          `${scenario.label} result fixture ${scenario.resultExamCode} is unavailable on Monday, July 20, 2026 for ${status.username}. Visible result codes: ${status.visibleResultCodes.join(", ") || "none"}.`,
        ).toBe(true);
      }

      if (scenario.requiresPublishedResult) {
        expect(
          status.publishedResultReady,
          `${scenario.label} result fixture ${scenario.resultExamCode} is not published on Monday, July 20, 2026 for ${status.username}. Visible result codes: ${status.visibleResultCodes.join(", ") || "none"}.`,
        ).toBe(true);
      }

      if (scenario.requiresReviewReadyResult) {
        expect(
          status.reviewReadyResult,
          `${scenario.label} result fixture ${scenario.resultExamCode} is not review-ready on Monday, July 20, 2026 for ${status.username}. Visible result codes: ${status.visibleResultCodes.join(", ") || "none"}.`,
        ).toBe(true);
      }

      if (scenario.requiresLaunchableAction) {
        expect(
          status.launchableAction === "start" || status.launchableAction === "resume",
          `${scenario.label} exam fixture ${status.examCode} is visible but not launchable on Monday, July 20, 2026 for ${status.username}. Observed primary action: ${status.launchableAction ?? "none"}.`,
        ).toBe(true);
      }
    });
  }
});
