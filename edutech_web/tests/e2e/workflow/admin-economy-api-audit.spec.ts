import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

test.describe("Admin economy API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin support ops economy workspace avoids duplicate fetches and keeps student scope correct", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/economy?tab=support-ops");
      await expect(page).toHaveURL(/\/admin\/economy\?tab=support-ops/);
      await expect(
        page.getByRole("heading", { name: /inspect wallet state and perform controlled admin actions/i }),
      ).toBeVisible();
      await audit.waitForSettled({ quietWindowMs: 700, timeoutMs: 15_000 });
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-economy-support-ops-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialDuplicates).toEqual([]);

      const studentSelect = page.getByRole("combobox", { name: /^student$/i });
      await expect(studentSelect).toBeVisible();
      const currentStudentId = await studentSelect.inputValue();
      expect(currentStudentId).toBeTruthy();

      let studentSwitchEntries: ReturnType<typeof audit.entries> = [];
      let studentSwitchDuplicates: ReturnType<typeof summarizeDuplicateRequests> = [];

      const studentOptions = await studentSelect.locator("option").evaluateAll((options) =>
        options.map((option) => ({
          label: (option as HTMLOptionElement).label,
          value: (option as HTMLOptionElement).value,
        })),
      );
      const alternateStudent = studentOptions.find((option) => option.value && option.value !== currentStudentId) ?? null;

      if (alternateStudent) {
        const switchStartedAt = Date.now();
        audit.reset();
        await studentSelect.selectOption(alternateStudent.value);
        await audit.waitForSettled({ quietWindowMs: 700, timeoutMs: 15_000 });
        metrics.push({
          elapsedMs: Date.now() - switchStartedAt,
          label: "admin-economy-student-switch",
        });

        studentSwitchEntries = audit.entries();
        studentSwitchDuplicates = summarizeDuplicateRequests(studentSwitchEntries);
        expect(studentSwitchDuplicates).toEqual([]);

        const switchPolicyEntries = studentSwitchEntries.filter(
          (entry) => entry.method === "GET" && entry.pathname === "/api/admin/economy/policy",
        );
        expect(switchPolicyEntries).toHaveLength(0);

        const switchWalletEntries = studentSwitchEntries.filter(
          (entry) =>
            entry.method === "GET" &&
            entry.pathname === `/api/admin/economy/student/${alternateStudent.value}/wallet`,
        );
        const switchRewardEntries = studentSwitchEntries.filter(
          (entry) =>
            entry.method === "GET" &&
            entry.pathname === `/api/admin/economy/student/${alternateStudent.value}/rewards`,
        );
        const switchOrderEntries = studentSwitchEntries.filter(
          (entry) =>
            entry.method === "GET" &&
            entry.pathname === `/api/admin/economy/student/${alternateStudent.value}/orders`,
        );

        expect(switchWalletEntries).toHaveLength(1);
        expect(switchRewardEntries).toHaveLength(0);
        expect(switchOrderEntries).toHaveLength(0);
      }

      const refreshStartedAt = Date.now();
      audit.reset();
      await page.getByRole("button", { name: /refresh unlocks/i }).click();
      await expect(page.getByText(/unlock refresh output/i).first()).toBeVisible();
      await audit.waitForSettled({ quietWindowMs: 700, timeoutMs: 15_000 });
      metrics.push({
        elapsedMs: Date.now() - refreshStartedAt,
        label: "admin-economy-refresh-unlocks",
      });

      const refreshEntries = audit.entries();
      const refreshDuplicates = summarizeDuplicateRequests(refreshEntries);
      expect(refreshDuplicates).toEqual([]);

      const activeStudentId = await studentSelect.inputValue();
      const refreshPostEntries = refreshEntries.filter(
        (entry) =>
          entry.method === "POST" &&
          entry.pathname === `/api/admin/economy/student/${activeStudentId}/refresh-unlocks`,
      );
      expect(refreshPostEntries).toHaveLength(1);
      expect(refreshPostEntries[0]?.status).toBe(200);

      const refreshWalletEntries = refreshEntries.filter(
        (entry) =>
          entry.method === "GET" &&
          entry.pathname === `/api/admin/economy/student/${activeStudentId}/wallet`,
      );
      const refreshRewardEntries = refreshEntries.filter(
        (entry) =>
          entry.method === "GET" &&
          entry.pathname === `/api/admin/economy/student/${activeStudentId}/rewards`,
      );
      const refreshOrderEntries = refreshEntries.filter(
        (entry) =>
          entry.method === "GET" &&
          entry.pathname === `/api/admin/economy/student/${activeStudentId}/orders`,
      );

      expect(refreshWalletEntries).toHaveLength(0);
      expect(refreshRewardEntries).toHaveLength(0);
      expect(refreshOrderEntries).toHaveLength(0);

      const expectedServerRenderContract = {
        "tab=support-ops": [
          "/api/v1/economy/admin/institute-subscription-requests/",
          "/api/v1/students/?page_size=100",
          "/api/v1/students/",
          "/api/v1/institutes/?page_size=100",
          "/api/v1/economy/admin/policy/",
          `/api/v1/economy/admin/student/${activeStudentId}/wallet/`,
          `/api/v1/economy/admin/student/${activeStudentId}/rewards/`,
          `/api/v1/economy/admin/student/${activeStudentId}/orders/`,
        ],
      };

      const payload = {
        route: "admin-economy",
        tab: "support-ops",
        selectedStudentId: activeStudentId,
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          refreshUnlocks: refreshEntries,
          studentSwitch: studentSwitchEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          refreshUnlocks: refreshDuplicates,
          studentSwitch: studentSwitchDuplicates,
        },
      };

      await testInfo.attach("admin-economy-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-economy-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
