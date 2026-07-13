import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { createTeacherFamilyExamDirectly, familyRuntimeScenarios } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableTeacherExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
);
const teacherApiBaseUrl = (
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

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteTeacherExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

type TeacherExamDetailResponse = {
  id: string;
  title: string;
  code: string;
  academic_year: string;
  program: string;
  cohort: string | null;
  publish_readiness: {
    blockers: Array<{ code: string; field: string; message: string }>;
  };
  access_slots: Array<{
    id: string;
    slot_label: string;
    status: string;
    cohort: string | null;
  }>;
  assigned_students: Array<{
    id: string;
    student: string;
    full_name: string;
    access_slot: string | null;
    access_slot_label: string | null;
    notes: string;
  }>;
};

async function fetchTeacherExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as TeacherExamDetailResponse;
}

async function fetchScopedStudents(page: Page, args: {
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

  const response = await page.request.get(`${teacherApiBaseUrl}/api/v1/students/?${searchParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as {
    results: Array<{ id: string; full_name: string; admission_no: string }>;
  };
  return payload.results;
}

async function updateExamAssignments(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.post(`${teacherApiBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Teacher exam slot management", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.skip(
    !mutableTeacherExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_EXAM_DETAIL_ACTIONS",
      "disposable teacher slot-management coverage",
    ),
  );

  test("@workflow @mutable teacher can manage slot-based access windows and student overrides from exam detail", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const firstSlotLabel = `Morning Slot ${uniqueSeed}`;
    const secondSlotLabel = `Overflow Slot ${uniqueSeed}`;
    const overrideNote = `Support override ${uniqueSeed}`;
    const now = new Date();
    const slotStartValue = formatDateTimeLocal(new Date(now.getTime() + 60 * 60 * 1000));
    const slotEndValue = formatDateTimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000));
    let examId: string | null = null;

    try {
      const created = await createTeacherFamilyExamDirectly(page, deterministicWizardScenario, uniqueSeed, {
        titlePrefix: "PW Teacher Slots",
        codePrefix: "PWTSM",
      });
      examId = created.examId;

      const initialDetail = await fetchTeacherExamDetail(page, examId);
      const students = await fetchScopedStudents(page, {
        academicYear: initialDetail.academic_year,
        program: initialDetail.program,
        cohort: initialDetail.cohort,
      });
      expect(students.length).toBeGreaterThan(0);
      const targetStudent = students[0]!;

      await updateExamAssignments(page, examId, []);
      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByText(/access slots/i).first()).toBeVisible();

      const slotPanel = page.locator("article").filter({
        has: page.getByText(/^access slots$/i).first(),
      }).first();
      const createSlotForm = slotPanel.locator("form.builderForm").first();
      await createSlotForm.locator('input[name="slot_label"]').fill(firstSlotLabel);
      await createSlotForm.locator('input[name="slot_start_at"]').fill(slotStartValue);
      await createSlotForm.locator('input[name="slot_end_at"]').fill(slotEndValue);
      await createSlotForm.locator('input[name="grace_period_minutes"]').fill("20");
      await createSlotForm.locator('input[name="assignment_capacity"]').fill("40");
      await createSlotForm.locator('input[name="start_capacity"]').fill("15");
      await createSlotForm.getByRole("button", { name: /create slot/i }).click();

      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/exam slot created successfully/i)).toBeVisible();

      let detail = await fetchTeacherExamDetail(page, examId);
      expect(detail.access_slots.some((slot) => slot.slot_label === firstSlotLabel)).toBe(true);
      expect(detail.publish_readiness.blockers.map((issue) => issue.code)).toContain(
        "missing_selected_student_assignments",
      );
      await expect(page.getByText(/missing selected student assignments/i).first()).toBeVisible();

      await updateExamAssignments(page, examId, [targetStudent.id]);
      await page.goto(`/teacher/exams/${examId}`);
      await expect(
        page.locator('select[name="student"] option').filter({
          hasText: new RegExp(escapeRegExp(targetStudent.full_name), "i"),
        }),
      ).toHaveCount(1);

      detail = await fetchTeacherExamDetail(page, examId);
      expect(detail.publish_readiness.blockers.map((issue) => issue.code)).not.toContain(
        "missing_selected_student_assignments",
      );

      const refreshedSlotPanel = page.locator("article").filter({
        has: page.getByText(/^access slots$/i).first(),
      }).first();
      const refreshedCreateSlotForm = refreshedSlotPanel.locator("form.builderForm").first();
      await refreshedCreateSlotForm.locator('input[name="slot_label"]').fill(secondSlotLabel);
      await refreshedCreateSlotForm.locator('input[name="slot_start_at"]').fill(slotStartValue);
      await refreshedCreateSlotForm.locator('input[name="slot_end_at"]').fill(slotEndValue);
      await refreshedCreateSlotForm.getByRole("button", { name: /create slot/i }).click();

      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/exam slot created successfully/i)).toBeVisible();

      detail = await fetchTeacherExamDetail(page, examId);
      expect(detail.access_slots.length).toBeGreaterThanOrEqual(2);
      const activeSlot = detail.access_slots.find((slot) => slot.slot_label === firstSlotLabel);
      expect(activeSlot).toBeTruthy();

      const overrideForm = page.locator('form.builderForm').filter({
        has: page.locator('select[name="student"]'),
      }).first();
      await overrideForm.locator('select[name="student"]').selectOption(targetStudent.id);
      await overrideForm.locator('select[name="access_slot"]').selectOption(activeSlot!.id);
      await overrideForm.locator('input[name="notes"]').fill(overrideNote);
      await overrideForm.getByRole("button", { name: /save student override/i }).click();

      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByText(/student slot override updated successfully/i)).toBeVisible();

      detail = await fetchTeacherExamDetail(page, examId);
      const assignedStudent = detail.assigned_students.find((student) => student.student === targetStudent.id);
      expect(assignedStudent).toBeTruthy();
      expect(assignedStudent?.access_slot_label).toBe(firstSlotLabel);
      expect(assignedStudent?.notes).toBe(overrideNote);
    } finally {
      if (examId) {
        await deleteTeacherExamDirectly(page, examId);
      }
    }
  });
});
