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

test.describe("Admin people API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin people workspace sends scoped requests with the right params", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/people?view=students");
      await expect(page.getByRole("combobox", { name: /select institute/i })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /student roster and login management/i }).first(),
      ).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-people-students-open",
      });

      const initialClientEntries = audit.entries();
      const initialDuplicateRequests = summarizeDuplicateRequests(initialClientEntries);
      expect(initialDuplicateRequests).toEqual([]);

      const instituteSelect = page.getByRole("combobox", { name: /select institute/i });
      const selectedInstituteId = await instituteSelect.inputValue();
      expect(selectedInstituteId).toBeTruthy();

      const expectedStudentServerContract = [
        "/api/v1/institutes/?page_size=50",
        `/api/v1/academics/academic-years/?institute=${selectedInstituteId}&page_size=100`,
        `/api/v1/academics/programs/?institute=${selectedInstituteId}&page_size=100`,
        `/api/v1/academics/cohorts/?institute=${selectedInstituteId}&page_size=100`,
        `/api/v1/students/?institute=${selectedInstituteId}&page_size=8`,
        `/api/v1/students/?institute=${selectedInstituteId}`,
      ];

      const studentOpenStartedAt = Date.now();
      audit.reset();
      await page.getByRole("button", { name: /update view/i }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/people\\?[^#]*view=students`));
      await expect(page).toHaveURL(new RegExp(`institute=${selectedInstituteId}`));
      await expect(
        page.getByRole("heading", { name: /student roster and login management/i }).first(),
      ).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - studentOpenStartedAt,
        label: "admin-people-students-open-scope",
      });

      const studentWorkspaceEntries = audit.entries();
      const studentWorkspaceDuplicates = summarizeDuplicateRequests(studentWorkspaceEntries);
      expect(studentWorkspaceDuplicates).toEqual([]);

      const studentWorkspaceCall = studentWorkspaceEntries.filter(
        (entry) => entry.method === "GET" && entry.pathname === "/api/admin/people/workspace",
      );
      expect(studentWorkspaceCall).toHaveLength(1);
      expect(studentWorkspaceCall[0]?.status).toBe(200);
      expect(studentWorkspaceCall[0]?.query).toEqual({
        institute: [selectedInstituteId],
        view: ["students"],
      });

      const teachersOpenStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /^teachers$/i }).click();
      await expect(page).toHaveURL(/\/admin\/people\?[^#]*view=teachers/);
      await expect(
        page.getByRole("heading", { name: /teacher roster and login management/i }).first(),
      ).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - teachersOpenStartedAt,
        label: "admin-people-teachers-open",
      });

      const teacherWorkspaceEntries = audit.entries();
      const teacherWorkspaceDuplicates = summarizeDuplicateRequests(teacherWorkspaceEntries);
      expect(teacherWorkspaceDuplicates).toEqual([]);
      const teacherWorkspaceCall = teacherWorkspaceEntries.filter(
        (entry) => entry.method === "GET" && entry.pathname === "/api/admin/people/workspace",
      );
      expect(teacherWorkspaceCall).toHaveLength(1);
      expect(teacherWorkspaceCall[0]?.status).toBe(200);
      expect(teacherWorkspaceCall[0]?.query).toEqual({
        institute: [selectedInstituteId],
        view: ["teachers"],
      });

      const expectedTeacherServerContract = [
        "/api/v1/institutes/?page_size=50",
        `/api/v1/teachers/?institute=${selectedInstituteId}&page_size=8`,
        `/api/v1/teachers/?institute=${selectedInstituteId}`,
      ];

      const studentsReturnStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /^students$/i }).click();
      await expect(page).toHaveURL(/\/admin\/people\?[^#]*view=students/);
      await expect(
        page.getByRole("heading", { name: /student roster and login management/i }).first(),
      ).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - studentsReturnStartedAt,
        label: "admin-people-students-return",
      });

      const studentReturnEntries = audit.entries();
      const studentReturnDuplicates = summarizeDuplicateRequests(studentReturnEntries);
      expect(studentReturnDuplicates).toEqual([]);
      const studentReturnWorkspaceCall = studentReturnEntries.filter(
        (entry) => entry.method === "GET" && entry.pathname === "/api/admin/people/workspace",
      );
      expect(studentReturnWorkspaceCall).toHaveLength(1);
      expect(studentReturnWorkspaceCall[0]?.status).toBe(200);
      expect(studentReturnWorkspaceCall[0]?.query).toEqual({
        institute: [selectedInstituteId],
        view: ["students"],
      });

      const payload = {
        notes: {
          initialClientFetchObservation:
            "The first `/admin/people` load is server-rendered. Browser-observed traffic starts when the user opens a scoped institute view or switches between student and teacher tabs.",
        },
        route: "admin-people",
        selectedInstituteId: resolveSelectedInstituteId(page.url()) ?? selectedInstituteId,
        expectedServerRenderContract: {
          students: expectedStudentServerContract,
          teachers: expectedTeacherServerContract,
        },
        metrics,
        observedClientTraffic: {
          initialLoad: initialClientEntries,
          studentsOpenScope: studentWorkspaceEntries,
          teachersOpen: teacherWorkspaceEntries,
          studentsReturn: studentReturnEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicateRequests,
          studentsOpenScope: studentWorkspaceDuplicates,
          teachersOpen: teacherWorkspaceDuplicates,
          studentsReturn: studentReturnDuplicates,
        },
      };

      await testInfo.attach("admin-people-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-people-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
    }
  });
});
