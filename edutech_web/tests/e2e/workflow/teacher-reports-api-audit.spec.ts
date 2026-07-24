import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Teacher reports API audit", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher reports hub handoffs avoid extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/teacher/reports");
      await expect(page.getByRole("heading", { name: /reports hub/i }).first()).toBeVisible();
      await expect(page.getByText(/teacher student-level reports/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "teacher-reports-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const subjectStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /open subject report/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/reports\/subjects(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /subject performance report/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - subjectStartedAt,
        label: "teacher-reports-open-subject-report",
      });

      const subjectEntries = audit.entries();
      const subjectDuplicates = summarizeDuplicateRequests(subjectEntries);
      expect(subjectEntries).toEqual([]);
      expect(subjectDuplicates).toEqual([]);

      const wrongQuestionsStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/teacher/reports");
      await page.getByRole("link", { name: /open wrong questions report/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/reports\/wrong-questions(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /wrong questions report/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - wrongQuestionsStartedAt,
        label: "teacher-reports-open-wrong-questions-report",
      });

      const wrongQuestionEntries = audit.entries();
      const wrongQuestionDuplicates = summarizeDuplicateRequests(wrongQuestionEntries);
      expect(wrongQuestionEntries).toEqual([]);
      expect(wrongQuestionDuplicates).toEqual([]);

      const timeManagementStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/teacher/reports");
      await page.getByRole("link", { name: /open time management report/i }).first().click();
      await expect(page).toHaveURL(/\/teacher\/reports\/time-management(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /time management report/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - timeManagementStartedAt,
        label: "teacher-reports-open-time-management-report",
      });

      const timeManagementEntries = audit.entries();
      const timeManagementDuplicates = summarizeDuplicateRequests(timeManagementEntries);
      expect(timeManagementEntries).toEqual([]);
      expect(timeManagementDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        reportsHubContract: [
          "teacher report hub is fully server-rendered",
          "report cards and directory rows are static route-handshake content",
          "browser interactions should only navigate to deeper report routes",
        ],
        detailRouteContract: [
          "teacher subject performance uses teacher insight summary",
          "teacher wrong questions uses teacher insight summary",
          "teacher time management uses teacher insight summary + result summary + attempt page",
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Teacher reports routes are server-rendered, so opening the reports hub and using report-directory handoffs should not emit extra browser-side API traffic.",
        },
        route: "teacher-reports",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          openSubjectReport: subjectEntries,
          openWrongQuestionsReport: wrongQuestionEntries,
          openTimeManagementReport: timeManagementEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          openSubjectReport: subjectDuplicates,
          openWrongQuestionsReport: wrongQuestionDuplicates,
          openTimeManagementReport: timeManagementDuplicates,
        },
      };

      await testInfo.attach("teacher-reports-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("teacher-reports-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
