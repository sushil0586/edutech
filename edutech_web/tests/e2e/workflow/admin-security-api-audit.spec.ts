import { expect, test, type Locator, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function waitForNonEmptyOptionValues(locator: Locator) {
  await expect
    .poll(async () => {
      return locator.locator("option").evaluateAll((options) =>
        options.filter((option) => (option as HTMLOptionElement).value.trim().length > 0).length,
      );
    })
    .toBeGreaterThan(0);
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await waitForNonEmptyOptionValues(locator);
  const firstValue = await locator.locator("option").evaluateAll((options) => {
    const option = options.find((entry) => (entry as HTMLOptionElement).value.trim().length > 0);
    return option ? (option as HTMLOptionElement).value : "";
  });
  expect(firstValue).not.toBe("");
  await locator.selectOption(firstValue);
}

async function backendAccessToken(page: Parameters<typeof createNetworkAudit>[0]) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
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

async function createAdminWizardExam(page: Parameters<typeof createNetworkAudit>[0], uniqueSeed: number) {
  const examTitle = `PW Admin Security Audit ${uniqueSeed}`;
  const examCode = `PW-ASEC-${uniqueSeed}`;

  await page.goto("/admin/exams/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  const preferredInstituteChip = page.locator(".academicInstituteChip").filter({
    hasText: /Demo Learning Institute|DLI001/i,
  }).first();
  if (await preferredInstituteChip.count()) {
    await preferredInstituteChip.click();
    await expect(page).toHaveURL(/\/admin\/exams\/new\?institute=/);
  }

  const academicYear = page.locator('select[name="academic_year"]').first();
  const program = page.locator('select[name="program"]').first();
  const subject = page.locator('select[name="subject"]').first();
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.locator('select[name="source_type"]').selectOption("platform");
  if ((await academicYear.inputValue()) === "") {
    await selectFirstNonEmptyOption(academicYear);
  }
  await selectFirstNonEmptyOption(program);
  await expect(subject).toBeEnabled();
  await selectFirstNonEmptyOption(subject);

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await page.getByRole("button", { name: /create exam shell/i }).click();
  await expect(page).toHaveURL(/\/admin\/exams\?message=/);

  const createdExamCard = page.locator(".examCard").filter({
    has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first(),
  }).first();
  await expect(createdExamCard).toBeVisible();

  const openExamHref = await createdExamCard.getByRole("link", { name: /view exam|open exam/i }).getAttribute("href");
  const examId = openExamHref?.match(/\/admin\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examCode,
    examId: examId!,
    examTitle,
  };
}

async function saveSecurityMode(page: Parameters<typeof createNetworkAudit>[0], examId: string, securityMode = "focus") {
  await page.goto(`/admin/exams/${examId}/builder`);
  await expect(page.getByRole("button", { name: /save exam settings/i })).toBeVisible();
  const securityModeSelect = page.locator('select[name="security_mode"]').first();
  await expect(securityModeSelect.locator(`option[value="${securityMode}"]`)).toHaveCount(1);
  await securityModeSelect.selectOption(securityMode);
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();
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

      const seededExam = await createAdminWizardExam(page, Date.now());
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
