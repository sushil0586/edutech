import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Admin settings API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin settings stays browser-quiet and keeps handoffs direct", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/settings");
      await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
      await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-settings-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const peopleHandoffStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /manage people/i }).click();
      await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
      await expect(page.getByText(/student roster|teacher roster/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - peopleHandoffStartedAt,
        label: "admin-settings-handoff-people",
      });

      const peopleHandoffEntries = audit.entries();
      const peopleHandoffDuplicates = summarizeDuplicateRequests(peopleHandoffEntries);
      expect(peopleHandoffEntries).toEqual([]);
      expect(peopleHandoffDuplicates).toEqual([]);

      const academicsHandoffStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, "/admin/settings");
      await page.getByRole("link", { name: /manage academics/i }).click();
      await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
      await expect(page.getByText(/academic setup/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - academicsHandoffStartedAt,
        label: "admin-settings-handoff-academics",
      });

      const academicsHandoffEntries = audit.entries();
      const academicsHandoffDuplicates = summarizeDuplicateRequests(academicsHandoffEntries);
      expect(academicsHandoffEntries).toEqual([]);
      expect(academicsHandoffDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        settingsSummary: [
          "/api/v1/institutes/?page_size=50",
          "/api/v1/economy/admin/policy-config/",
          "/api/v1/economy/admin/policy-audit/?page_size=5",
          "/api/v1/students/",
          "/api/v1/teachers/",
          "/api/v1/academics/academic-years/",
          "/api/v1/academics/subjects/",
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Admin settings is server-rendered. The page should not emit extra browser-side API traffic on load or direct handoff links.",
        },
        route: "admin-settings",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          handoffAcademics: academicsHandoffEntries,
          handoffPeople: peopleHandoffEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          handoffAcademics: academicsHandoffDuplicates,
          handoffPeople: peopleHandoffDuplicates,
        },
      };

      await testInfo.attach("admin-settings-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-settings-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
