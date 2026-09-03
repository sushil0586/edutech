import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

type PaginatedResponse<T> = {
  results: T[];
};

type InstituteRecord = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

type SubjectRecord = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const adminInstituteCode = "DLI001";
const canonicalAcademicYearName = "2026-2027";
const canonicalProgramName = "Class 10 Foundation";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Parameters<typeof createNetworkAudit>[0]) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchAdminApiJson<T>(
  page: Parameters<typeof createNetworkAudit>[0],
  path: string,
) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as T;
}

async function deleteAdminExamDirectly(page: Parameters<typeof createNetworkAudit>[0], examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function resolveAdminExamScope(page: Parameters<typeof createNetworkAudit>[0]) {
  const institutes = await fetchAdminApiJson<PaginatedResponse<InstituteRecord>>(
    page,
    "/api/v1/institutes/?page_size=100",
  );
  const institute =
    institutes.results.find((entry) => entry.code === adminInstituteCode) ?? institutes.results[0] ?? null;
  expect(institute).not.toBeNull();

  const academicYears = await fetchAdminApiJson<PaginatedResponse<AcademicYearRecord>>(
    page,
    `/api/v1/academics/academic-years/?is_active=true&institute=${encodeURIComponent(institute!.id)}&page_size=200`,
  );
  const academicYear =
    academicYears.results.find((entry) => entry.name.trim() === canonicalAcademicYearName) ??
    academicYears.results[0] ??
    null;
  expect(academicYear).not.toBeNull();

  const programs = await fetchAdminApiJson<PaginatedResponse<ProgramRecord>>(
    page,
    `/api/v1/academics/programs/?is_active=true&institute=${encodeURIComponent(institute!.id)}&page_size=200`,
  );
  const program =
    programs.results.find((entry) => entry.name.trim() === canonicalProgramName) ??
    programs.results[0] ??
    null;
  expect(program).not.toBeNull();

  const subjects = await fetchAdminApiJson<PaginatedResponse<SubjectRecord>>(
    page,
    `/api/v1/academics/subjects/?is_active=true&institute=${encodeURIComponent(institute!.id)}&program=${encodeURIComponent(program!.id)}&page_size=200`,
  );
  const subject =
    subjects.results.find((entry) => !/^PW Sparse Subject\b/i.test(entry.name)) ??
    subjects.results[0] ??
    null;
  expect(subject).not.toBeNull();

  return {
    academicYearId: academicYear!.id,
    instituteId: institute!.id,
    programId: program!.id,
    subjectId: subject!.id,
  };
}

async function createAdminExamDirectly(page: Parameters<typeof createNetworkAudit>[0], uniqueSeed: number) {
  const examTitle = `PW Admin Security Audit ${uniqueSeed}`;
  const examCode = `PW-ASEC-${uniqueSeed}`;
  const scope = await resolveAdminExamScope(page);
  const accessToken = await backendAccessToken(page);
  const createResponse = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: scope.instituteId,
      academic_year: scope.academicYearId,
      program: scope.programId,
      cohort: null,
      subject: scope.subjectId,
      source_type: "platform",
      title: examTitle,
      code: examCode,
      description: "",
      exam_type: "quiz",
      delivery_mode: "online",
      duration_minutes: 30,
      total_marks: "0",
      passing_marks: "0",
      start_at: null,
      end_at: null,
      instructions: "",
      allow_late_submit: false,
      randomize_questions: false,
      randomize_options: false,
      show_result_immediately: true,
      allow_review_after_submit: true,
      max_attempts: 1,
      timer_mode: "global",
      navigation_mode: "free_section",
      attempt_policy: "single",
      result_publish_mode: "immediate",
      review_mode: "attempted_only",
      security_mode: "focus",
      rank_visibility_mode: "hidden",
      percentile_visibility_mode: "hidden",
      benchmark_visibility_mode: "peer_average_only",
      rank_freeze_policy: "freeze_on_exam_closure",
      allow_resume: true,
      allow_section_switching: true,
      allow_return_to_previous_section: true,
      result_publish_at: null,
      review_available_from: null,
      review_available_until: null,
    },
    timeout: 15000,
  });
  expect(createResponse.ok()).toBe(true);
  const createdExam = (await createResponse.json()) as { id: string };
  expect(createdExam.id).toBeTruthy();

  return {
    examCode,
    examId: createdExam.id,
    examTitle,
  };
}

async function saveSecurityMode(page: Parameters<typeof createNetworkAudit>[0], examId: string, securityMode = "focus") {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.patch(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      security_mode: securityMode,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Admin security API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test("@workflow admin security stays browser-quiet while filters and watch state remain URL-driven", async ({
    page,
  }, testInfo: TestInfo) => {
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];
    let seededExamId: string | null = null;
    let seededExamCode = "";
    let seededExamTitle = "";

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const seededExam = await createAdminExamDirectly(page, Date.now());
      seededExamId = seededExam.examId;
      seededExamCode = seededExam.examCode;
      seededExamTitle = seededExam.examTitle;
      await saveSecurityMode(page, seededExamId, "focus");
      await page.goto(`/admin/security?search=${encodeURIComponent(seededExamCode)}&exam_filter=elevated&exam_sort=latest`);
      await expect(page.getByText(new RegExp(escapeRegExp(seededExamTitle), "i")).first()).toBeVisible();
      audit.reset();

      const openStartedAt = Date.now();
      await gotoWithRuntimeRecovery(page, "/admin/security");
      await expect(page.getByRole("heading", { name: /^security$/i }).first()).toBeVisible();
      await expect(page.getByText(/security controls/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-security-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const applyStartedAt = Date.now();
      audit.reset();
      await page.locator('input[type="search"][name="search"]').first().fill("aws");
      await page.locator('select[name="exam_filter"]').first().selectOption("live");
      await page.locator('select[name="exam_sort"]').first().selectOption("latest");
      await page.locator('select[name="attempt_filter"]').first().selectOption("watch");
      await page.locator('select[name="attempt_sort"]').first().selectOption("alerts_high");
      await page.locator('select[name="attempt_group"]').first().selectOption("health");
      await page.locator('select[name="exam_page_size"]').first().selectOption("12");
      await page.locator('select[name="attempt_page_size"]').first().selectOption("18");
      await page.getByRole("button", { name: /apply filters/i }).click();
      await expect(page).toHaveURL(/search=aws/i);
      await expect(page).toHaveURL(/exam_filter=live/);
      await expect(page).toHaveURL(/exam_sort=latest/);
      await expect(page).toHaveURL(/attempt_filter=watch/);
      await expect(page).toHaveURL(/attempt_sort=alerts_high/);
      await expect(page).toHaveURL(/attempt_group=health/);
      await expect(page).toHaveURL(/exam_page_size=12/);
      await expect(page).toHaveURL(/attempt_page_size=18/);
      await expect(page.getByText(/^exam scope: live$/i).first()).toBeVisible();
      await expect(page.getByText(/^attempt scope: watch$/i).first()).toBeVisible();
      await expect(page.getByText(/^group: health$/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - applyStartedAt,
        label: "admin-security-apply-filters",
      });

      const applyEntries = audit.entries();
      const applyDuplicates = summarizeDuplicateRequests(applyEntries);
      expect(applyEntries).toEqual([]);
      expect(applyDuplicates).toEqual([]);

      const criticalQuickFilterStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /critical attempts/i }).click();
      await expect(page).toHaveURL(/attempt_filter=critical/);
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - criticalQuickFilterStartedAt,
        label: "admin-security-quick-filter-critical",
      });

      const criticalQuickFilterEntries = audit.entries();
      const criticalQuickFilterDuplicates = summarizeDuplicateRequests(criticalQuickFilterEntries);
      expect(criticalQuickFilterEntries).toEqual([]);
      expect(criticalQuickFilterDuplicates).toEqual([]);

      let watchExamEntries: ReturnType<typeof audit.entries> = [];
      let watchExamDuplicates: ReturnType<typeof summarizeDuplicateRequests> = [];
      let resetEntries: ReturnType<typeof audit.entries> = [];
      let resetDuplicates: ReturnType<typeof summarizeDuplicateRequests> = [];
      let selectedExamId: string | null = null;

      await gotoWithRuntimeRecovery(
        page,
        `/admin/security?search=${encodeURIComponent(seededExamCode)}&exam_filter=elevated&exam_sort=latest`,
      );
      await expect(page.getByText(new RegExp(escapeRegExp(seededExamTitle), "i")).first()).toBeVisible();

      const watchExamStartedAt = Date.now();
      audit.reset();
      const watchExamButton = page.getByRole("link", { name: /watch exam|watching/i }).first();
      await expect(watchExamButton).toBeVisible();
      await watchExamButton.click();
      await expect(page).toHaveURL(/examId=/);
      await expect(page).toHaveURL(new RegExp(`examId=${seededExamId}`));
      await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
      await expect(page.getByText(/live monitor summary/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - watchExamStartedAt,
        label: "admin-security-watch-exam",
      });

      selectedExamId = new URL(page.url()).searchParams.get("examId");
      expect(selectedExamId).toBeTruthy();
      watchExamEntries = audit.entries();
      watchExamDuplicates = summarizeDuplicateRequests(watchExamEntries);
      expect(watchExamEntries).toEqual([]);
      expect(watchExamDuplicates).toEqual([]);

      const resetStartedAt = Date.now();
      audit.reset();
      await page.getByRole("link", { name: /reset filters/i }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/security\\?examId=${selectedExamId}`));
      await expect(page.getByText(/selected exam posture/i).first()).toBeVisible();
      await expect(page.getByText(/^exam scope: all$/i).first()).toBeVisible();
      await expect(page.getByText(/^attempt scope: all$/i).first()).toBeVisible();
      await expect(page.getByText(/^group: none$/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - resetStartedAt,
        label: "admin-security-reset-filters-preserve-watch",
      });

      resetEntries = audit.entries();
      resetDuplicates = summarizeDuplicateRequests(resetEntries);
      expect(resetEntries).toEqual([]);
      expect(resetDuplicates).toEqual([]);

      const expectedServerRenderContract = {
        examList: ["/api/v1/teacher/exams/?page_size=8"],
        selectedExamRuntime: [
          "/api/v1/results/exam/:examId/live-monitor/",
          "/api/v1/results/exam/:examId/attempts/?page_size=12",
        ],
        "filter-param-contract": [
          "examId",
          "exam_filter",
          "exam_sort",
          "exam_page",
          "exam_page_size",
          "attempt_filter",
          "attempt_sort",
          "attempt_group",
          "attempt_page",
          "attempt_page_size",
          "search",
        ],
      };

      const payload = {
        notes: {
          browserVisibility:
            "Admin security is server-rendered from exam list and selected-exam monitor endpoints. Browser-side API traffic should remain empty while filters, quick links, watch state, and reset actions stay URL-driven.",
          watchState:
            "The audit seeds a disposable elevated exam, clicks its watch action, and verifies that reset filters preserves examId and the selected monitoring context.",
        },
        route: "admin-security",
        expectedServerRenderContract,
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          applyFilters: applyEntries,
          quickFilterCritical: criticalQuickFilterEntries,
          watchExam: watchExamEntries,
          resetFilters: resetEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          applyFilters: applyDuplicates,
          quickFilterCritical: criticalQuickFilterDuplicates,
          watchExam: watchExamDuplicates,
          resetFilters: resetDuplicates,
        },
      };

      await testInfo.attach("admin-security-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-security-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
      if (seededExamId) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);
        await deleteAdminExamDirectly(page, seededExamId);
      }
    }
  });
});
