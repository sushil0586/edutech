import { expect, test, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createAdminFamilyExamDirectly, familyRuntimeScenarios } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { createNetworkAudit, summarizeDuplicateRequests } from "../helpers/network-audit";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type TimingMetric = {
  elapsedMs: number;
  label: string;
};

const mutableAdminExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
);
const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const deterministicWizardScenario =
  familyRuntimeScenarios.find((scenario) => scenario.presetId === "aws_practitioner") ??
  familyRuntimeScenarios[0]!;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDateTimeLocal(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}


async function backendAccessToken(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteAdminExamDirectly(page: import("@playwright/test").Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

type AdminExamDetailResponse = {
  academic_year: string;
  program: string;
  cohort: string | null;
};

async function fetchAdminExamDetail(page: import("@playwright/test").Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminExamDetailResponse;
}

async function fetchScopedStudents(page: import("@playwright/test").Page, args: {
  academicYear: string;
  program: string;
  cohort?: string | null;
}) {
  const accessToken = await backendAccessToken(page);
  const searchParams = new URLSearchParams({
    page_size: "50",
    academic_year: args.academicYear,
    program: args.program,
    is_active: "true",
  });
  if (args.cohort) {
    searchParams.set("cohort", args.cohort);
  }
  const response = await page.request.get(`${adminApiBaseUrl}/api/v1/students/?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    results: Array<{ id: string; full_name: string }>;
  };
  return payload.results;
}

async function updateExamAssignments(page: import("@playwright/test").Page, examId: string, studentIds: string[]) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${adminApiBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
    timeout: 15_000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Admin exam slot API audit", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_EXAM_DETAIL_ACTIONS",
      "slot-management API audit coverage",
    ),
  );

  test("@workflow admin slot-enabled exam detail stays server-driven without duplicate browser-side API calls", async ({
    page,
  }, testInfo: TestInfo) => {
    test.setTimeout(180000);
    const audit = createNetworkAudit(page);
    const metrics: TimingMetric[] = [];
    let examId: string | null = null;

    try {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const created = await createAdminFamilyExamDirectly(page, deterministicWizardScenario, Date.now(), {
        titlePrefix: "PW Admin Slot Audit",
        codePrefix: "PWASA",
      });
      examId = created.examId;

      const initialDetail = await fetchAdminExamDetail(page, examId);
      const students = await fetchScopedStudents(page, {
        academicYear: initialDetail.academic_year,
        program: initialDetail.program,
        cohort: initialDetail.cohort,
      });
      expect(students.length).toBeGreaterThan(0);
      const targetStudent = students[0]!;
      await updateExamAssignments(page, examId, [targetStudent.id]);

      const openStartedAt = Date.now();
      audit.reset();
      await gotoWithRuntimeRecovery(page, `/admin/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(created.examTitle), "i") }).first()).toBeVisible();
      await expect(page.getByText(/^access slots$/i).first()).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - openStartedAt,
        label: "admin-exam-slot-detail-open",
      });

      const initialEntries = audit.entries();
      const initialDuplicates = summarizeDuplicateRequests(initialEntries);
      expect(initialEntries).toEqual([]);
      expect(initialDuplicates).toEqual([]);

      const slotPanel = page.locator("article").filter({
        has: page.getByText(/^access slots$/i).first(),
      }).first();
      const createSlotForm = slotPanel.locator("form.builderForm").first();
      const now = new Date();
      await createSlotForm.locator('input[name="slot_label"]').fill(`Audit Slot ${Date.now()}`);
      await createSlotForm.locator('input[name="slot_start_at"]').fill(
        formatDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000)),
      );
      await createSlotForm.locator('input[name="slot_end_at"]').fill(
        formatDateTimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000)),
      );

      const createStartedAt = Date.now();
      audit.reset();
      await createSlotForm.getByRole("button", { name: /create slot/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/exam slot created successfully/i)).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - createStartedAt,
        label: "admin-exam-slot-create",
      });

      const createEntries = audit.entries();
      const createDuplicates = summarizeDuplicateRequests(createEntries);
      expect(createEntries).toEqual([]);
      expect(createDuplicates).toEqual([]);

      const overrideForm = page.locator('form.builderForm').filter({
        has: page.locator('select[name="student"]'),
      }).first();
      await overrideForm.locator('input[name="notes"]').fill(`Audit override ${Date.now()}`);

      const overrideStartedAt = Date.now();
      audit.reset();
      await overrideForm.getByRole("button", { name: /save student override/i }).click();
      await expect(page).toHaveURL(/\/admin\/exams\/.+\?message=/);
      await expect(page.getByText(/student slot override updated successfully/i)).toBeVisible();
      await audit.waitForSettled();
      metrics.push({
        elapsedMs: Date.now() - overrideStartedAt,
        label: "admin-exam-slot-override",
      });

      const overrideEntries = audit.entries();
      const overrideDuplicates = summarizeDuplicateRequests(overrideEntries);
      expect(overrideEntries).toEqual([]);
      expect(overrideDuplicates).toEqual([]);

      const payload = {
        route: "admin-exam-slot-detail",
        examId,
        notes: {
          browserVisibility:
            "Slot-enabled exam detail is intentionally server-rendered. Opening the page and submitting slot/override forms should not emit extra browser-side `/api/admin/*` or `/api/v1/*` fetches.",
        },
        metrics,
        observedClientTraffic: {
          initialLoad: initialEntries,
          createSlot: createEntries,
          saveStudentOverride: overrideEntries,
        },
        duplicateRequests: {
          initialLoad: initialDuplicates,
          createSlot: createDuplicates,
          saveStudentOverride: overrideDuplicates,
        },
      };

      await testInfo.attach("admin-exam-slot-api-audit", {
        body: Buffer.from(JSON.stringify(payload, null, 2)),
        contentType: "application/json",
      });
      console.log("admin-exam-slot-api-audit", JSON.stringify(payload));
    } finally {
      audit.dispose();
      if (examId) {
        await deleteAdminExamDirectly(page, examId);
      }
    }
  });
});
