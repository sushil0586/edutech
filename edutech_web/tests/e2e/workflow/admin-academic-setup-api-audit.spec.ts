import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

function resolveSelectedInstituteId(pageUrl: string) {
  return new URL(pageUrl).searchParams.get("institute");
}

test.describe("Admin academic setup API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin academic setup preserves params and avoids extra browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/academic-setup");
      await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
      await expect(page.locator('select[aria-label="Select institute"]').first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-academic-setup-open",
      });

      const initialClientEntries = audit.entries();
      const initialDuplicateRequests = summarizeDuplicateRequests(initialClientEntries);
      expect(initialDuplicateRequests).toEqual([]);

      const instituteSelect = page.locator('select[aria-label="Select institute"]').first();
      const selectedInstituteId = (await instituteSelect.inputValue()).trim();
      expect(selectedInstituteId).toBeTruthy();

      const openScopeStartedAt = Date.now();
      audit.reset();
      await page.getByRole("button", { name: /^open$/i }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?[^#]*institute=${selectedInstituteId}`));
      await expect(page).toHaveURL(/section=/);
      await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openScopeStartedAt,
        label: "admin-academic-setup-open-scope",
      });

      const scopedOpenEntries = audit.entries();
      const scopedOpenDuplicates = summarizeDuplicateRequests(scopedOpenEntries);
      expect(scopedOpenDuplicates).toEqual([]);
      expect(scopedOpenEntries).toEqual([]);

      const programsStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /programs/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?[^#]*institute=${selectedInstituteId}`));
      await expect(page).toHaveURL(/section=programs/);
      await expect(page.getByText(/^programs$/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - programsStartedAt,
        label: "admin-academic-setup-programs-open",
      });

      const programsEntries = audit.entries();
      const programsDuplicates = summarizeDuplicateRequests(programsEntries);
      expect(programsDuplicates).toEqual([]);
      expect(programsEntries).toEqual([]);

      const topicsStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /topics/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?[^#]*institute=${selectedInstituteId}`));
      await expect(page).toHaveURL(/section=topics/);
      await expect(page.getByText(/^topics$/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - topicsStartedAt,
        label: "admin-academic-setup-topics-open",
      });

      const topicsEntries = audit.entries();
      const topicsDuplicates = summarizeDuplicateRequests(topicsEntries);
      expect(topicsDuplicates).toEqual([]);
      expect(topicsEntries).toEqual([]);

      const examDefaultsStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /exam defaults/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/admin/academic-setup\\?[^#]*institute=${selectedInstituteId}`));
      await expect(page).toHaveURL(/section=exam-defaults/);
      await expect(page.getByText(/duration minutes/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - examDefaultsStartedAt,
        label: "admin-academic-setup-exam-defaults-open",
      });

      const examDefaultsEntries = audit.entries();
      const examDefaultsDuplicates = summarizeDuplicateRequests(examDefaultsEntries);
      expect(examDefaultsDuplicates).toEqual([]);
      expect(examDefaultsEntries).toEqual([]);

      const expectedServerRenderContract = {
        defaultSection: [
          "/api/v1/institutes/?page_size=50",
          `/api/v1/institutes/${selectedInstituteId}/`,
          `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/cohorts/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/subjects/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/topics/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/teachers/assignments/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/students/?institute=${selectedInstituteId}`,
          `/api/v1/teachers/?institute=${selectedInstituteId}`,
        ],
        "section=programs": [
          "/api/v1/institutes/?page_size=50",
          `/api/v1/institutes/${selectedInstituteId}/`,
          `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
          "/api/v1/academics/assessment-families/?page_size=50&is_active=true",
          `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/cohorts/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/subjects/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/topics/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/teachers/assignments/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/students/?institute=${selectedInstituteId}`,
          `/api/v1/teachers/?institute=${selectedInstituteId}`,
        ],
        "section=topics": [
          "/api/v1/institutes/?page_size=50",
          `/api/v1/institutes/${selectedInstituteId}/`,
          `/api/v1/academics/topics/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/cohorts/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/subjects/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/topics/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/teachers/assignments/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/students/?institute=${selectedInstituteId}`,
          `/api/v1/teachers/?institute=${selectedInstituteId}`,
        ],
        "section=exam-defaults": [
          "/api/v1/institutes/?page_size=50",
          `/api/v1/institutes/${selectedInstituteId}/`,
          "/api/v1/academics/option-catalog/?page_size=200&is_active=true",
          "/api/v1/academics/assessment-families/?page_size=50&is_active=true",
          `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/cohorts/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/subjects/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/academics/topics/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/teachers/assignments/?institute=${selectedInstituteId}&page_size=100`,
          `/api/v1/students/?institute=${selectedInstituteId}`,
          `/api/v1/teachers/?institute=${selectedInstituteId}`,
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Academic setup section switches are full-page server navigations, so the browser should not emit extra `/api/admin/*` or `/api/v1/*` calls during navigation itself. Data loading is represented here as a code-backed expected server contract.",
        },
        route: "admin-academic-setup",
        selectedInstituteId: resolveSelectedInstituteId(page.url()) ?? selectedInstituteId,
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialClientEntries,
          scopeOpen: scopedOpenEntries,
          programs: programsEntries,
          topics: topicsEntries,
          examDefaults: examDefaultsEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicateRequests,
          scopeOpen: scopedOpenDuplicates,
          programs: programsDuplicates,
          topics: topicsDuplicates,
          examDefaults: examDefaultsDuplicates,
        },
      };

      await testInfo.attach("admin-academic-setup-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-academic-setup-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
