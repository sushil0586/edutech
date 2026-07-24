import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Institute academic setup API audit", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute academic setup preserves params and avoids extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/institute/academic-setup");
      await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /academic years/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "institute-academic-setup-open",
      });

      const initialClientEntries = audit.entries();
      const initialDuplicateRequests = summarizeDuplicateRequests(initialClientEntries);
      expect(initialDuplicateRequests).toEqual([]);
      expect(initialClientEntries).toEqual([]);

      const programsStartedAt = Date.now();
      audit.reset();
      await page.locator('.adminPeopleViewTabs a[href="/institute/academic-setup?section=programs"]').click();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=programs/);
      await expect(page.getByRole("button", { name: /^(add|new)$/i })).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - programsStartedAt,
        label: "institute-academic-setup-programs-open",
      });

      const programsEntries = audit.entries();
      const programsDuplicates = summarizeDuplicateRequests(programsEntries);
      expect(programsDuplicates).toEqual([]);
      expect(programsEntries).toEqual([]);

      const topicsStartedAt = Date.now();
      audit.reset();
      await page.locator('.adminPeopleViewTabs a[href="/institute/academic-setup?section=topics"]').click();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=topics/);
      await expect(page.getByRole("button", { name: /^(add|new)$/i })).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - topicsStartedAt,
        label: "institute-academic-setup-topics-open",
      });

      const topicsEntries = audit.entries();
      const topicsDuplicates = summarizeDuplicateRequests(topicsEntries);
      expect(topicsDuplicates).toEqual([]);
      expect(topicsEntries).toEqual([]);

      const assignmentsStartedAt = Date.now();
      audit.reset();
      await page
        .locator('.adminPeopleViewTabs a[href="/institute/academic-setup?section=teacher-assignments"]')
        .click();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=teacher-assignments/);
      await expect(page.getByText(/teacher assignments/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /^(add|new)$/i })).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - assignmentsStartedAt,
        label: "institute-academic-setup-assignments-open",
      });

      const assignmentsEntries = audit.entries();
      const assignmentsDuplicates = summarizeDuplicateRequests(assignmentsEntries);
      expect(assignmentsDuplicates).toEqual([]);
      expect(assignmentsEntries).toEqual([]);

      const examDefaultsStartedAt = Date.now();
      audit.reset();
      await page.locator('.adminPeopleViewTabs a[href="/institute/academic-setup?section=exam-defaults"]').click();
      await expect(page).toHaveURL(/\/institute\/academic-setup\?section=exam-defaults/);
      await expect(page.getByText(/duration minutes/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - examDefaultsStartedAt,
        label: "institute-academic-setup-exam-defaults-open",
      });

      const examDefaultsEntries = audit.entries();
      const examDefaultsDuplicates = summarizeDuplicateRequests(examDefaultsEntries);
      expect(examDefaultsDuplicates).toEqual([]);
      expect(examDefaultsEntries).toEqual([]);

      const expectedServerRenderContract = {
        "section=academic-years": [
          "/api/v1/institutes/:instituteId/",
          "/api/v1/academics/academic-years/?institute=:instituteId&page_size=100",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/cohorts/?institute=:instituteId&page_size=100",
          "/api/v1/academics/subjects/?institute=:instituteId&page_size=100",
          "/api/v1/academics/topics/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/assignments/?institute=:instituteId&page_size=100",
          "/api/v1/students/?institute=:instituteId",
          "/api/v1/teachers/?institute=:instituteId",
        ],
        "section=programs": [
          "/api/v1/institutes/:instituteId/",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/assessment-families/?page_size=50&is_active=true",
          "/api/v1/academics/academic-years/?institute=:instituteId&page_size=100",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/cohorts/?institute=:instituteId&page_size=100",
          "/api/v1/academics/subjects/?institute=:instituteId&page_size=100",
          "/api/v1/academics/topics/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/assignments/?institute=:instituteId&page_size=100",
          "/api/v1/students/?institute=:instituteId",
          "/api/v1/teachers/?institute=:instituteId",
        ],
        "section=topics": [
          "/api/v1/institutes/:instituteId/",
          "/api/v1/academics/topics/?institute=:instituteId&page_size=100",
          "/api/v1/academics/academic-years/?institute=:instituteId&page_size=100",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/cohorts/?institute=:instituteId&page_size=100",
          "/api/v1/academics/subjects/?institute=:instituteId&page_size=100",
          "/api/v1/academics/topics/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/assignments/?institute=:instituteId&page_size=100",
          "/api/v1/students/?institute=:instituteId",
          "/api/v1/teachers/?institute=:instituteId",
        ],
        "section=teacher-assignments": [
          "/api/v1/institutes/:instituteId/",
          "/api/v1/academics/academic-years/?institute=:instituteId&page_size=100",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/cohorts/?institute=:instituteId&page_size=100",
          "/api/v1/academics/subjects/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/assignments/?institute=:instituteId&page_size=100",
          "/api/v1/students/?institute=:instituteId",
          "/api/v1/teachers/?institute=:instituteId",
        ],
        "section=exam-defaults": [
          "/api/v1/institutes/:instituteId/",
          "/api/v1/academics/option-catalog/?page_size=200&is_active=true",
          "/api/v1/academics/assessment-families/?page_size=50&is_active=true",
          "/api/v1/academics/academic-years/?institute=:instituteId&page_size=100",
          "/api/v1/academics/programs/?institute=:instituteId&page_size=100",
          "/api/v1/academics/cohorts/?institute=:instituteId&page_size=100",
          "/api/v1/academics/subjects/?institute=:instituteId&page_size=100",
          "/api/v1/academics/topics/?institute=:instituteId&page_size=100",
          "/api/v1/teachers/assignments/?institute=:instituteId&page_size=100",
          "/api/v1/students/?institute=:instituteId",
          "/api/v1/teachers/?institute=:instituteId",
        ],
        "filter-param-contract": ["section"],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Institute academic setup section switches are full-page server navigations, so the browser should not emit extra `/api/admin/*` or `/api/v1/*` calls during navigation itself. Data loading is represented here as a code-backed expected server contract.",
        },
        route: "institute-academic-setup",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialClientEntries,
          programs: programsEntries,
          topics: topicsEntries,
          teacherAssignments: assignmentsEntries,
          examDefaults: examDefaultsEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicateRequests,
          programs: programsDuplicates,
          topics: topicsDuplicates,
          teacherAssignments: assignmentsDuplicates,
          examDefaults: examDefaultsDuplicates,
        },
      };

      await testInfo.attach("institute-academic-setup-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("institute-academic-setup-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
