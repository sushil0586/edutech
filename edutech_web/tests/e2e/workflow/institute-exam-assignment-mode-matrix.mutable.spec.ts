import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  resolveStudentProfileScope,
  selectOptionByLabelFragment,
  type StudentProfileScope,
} from "../helpers/student-scope";

const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

type AssignmentModeOption = {
  value: string;
  label: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);

  try {
    const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });
    if (response.ok()) {
      return;
    }
  } catch {
    // Fall back to proxy cleanup.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

async function fetchInstituteExamDetail(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  let response = await page.request.get(`${instituteApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  if (!response.ok()) {
    response = await page.request.get(`/api/institute/exams/${examId}`, {
      timeout: 15000,
    });
  }
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    assignment_mode: string;
    assigned_students: Array<{
      id: string;
      full_name: string;
    }>;
  };
}

async function createInstituteWizardExam(page: Page, uniqueSeed: number, studentScope: StudentProfileScope) {
  const examTitle = `PW Institute Assignment Modes ${uniqueSeed}`;
  const examCode = `PW-IAM-${uniqueSeed}`;

  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  if (studentScope.academicYearName) {
    await selectOptionByLabelFragment(
      page.getByRole("combobox", { name: /academic year/i }),
      studentScope.academicYearName,
    );
  }
  if (studentScope.programName) {
    await selectOptionByLabelFragment(
      page.getByRole("combobox", { name: /^program/i }),
      studentScope.programName,
    );
  }
  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('select[name="exam_type"]').selectOption("quiz");
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.getByRole("button", { name: /create exam shell/i }).click();

  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  const detailUrl = page.url().split("?")[0] ?? page.url();
  const examId = detailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
  };
}

async function openAssignmentForm(page: Page, examId: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  return page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
}

async function readAssignmentModeOptions(assignmentForm: Locator) {
  return await assignmentForm.locator('select[name="assignment_mode"] option').evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      }))
      .filter((option) => option.value.trim().length > 0),
  ) as AssignmentModeOption[];
}

async function saveAssignmentMode(
  page: Page,
  assignmentForm: Locator,
  option: AssignmentModeOption,
  studentDisplayName: string,
) {
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption(option.value);

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  let studentCount = 0;
  if (option.value === "selected_students") {
    await expect
      .poll(async () => await studentCheckboxes.count(), {
        timeout: 10000,
        message: "Expected selected-students assignment mode to expose selectable learners.",
      })
      .toBeGreaterThanOrEqual(0);
    studentCount = await studentCheckboxes.count();
    if (studentCount === 0) {
      test.skip(true, "Selected-students assignment mode has no assignable learners in the current seeded institute scope.");
    }
  } else {
    studentCount = await studentCheckboxes.count();
  }

  if (option.value === "selected_students") {
    const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
      has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
    }).first();

    for (let index = 0; index < studentCount; index += 1) {
      await studentCheckboxes.nth(index).uncheck().catch(() => null);
    }

    if (await matchingStudentRow.count()) {
      await matchingStudentRow.locator('input[name="student_ids"]').check();
    } else {
      await studentCheckboxes.first().check();
    }
  }

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function expectDetailAssignmentState(
  page: Page,
  examId: string,
  studentDisplayName: string,
  option: AssignmentModeOption,
) {
  await page.goto(`/institute/exams/${examId}`);
  await expect(page.getByText(/assigned students/i).first()).toBeVisible();

  if (option.value === "selected_students") {
    await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
    await expect(page.getByText(/this exam currently has no directly assigned students\./i)).toHaveCount(0);
    return;
  }

  await expect(page.getByText(/this exam currently has no directly assigned students\./i)).toBeVisible();
}

test.describe("Institute exam assignment-mode matrix", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute assignment-mode enumeration coverage",
    ),
  );

  test("@workflow @mutable institute can persist every visible assignment mode from the exam builder", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const uniqueSeed = Date.now();
    let examId: string | null = null;
    const studentScope = await resolveStudentProfileScope(page);

    try {
      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      const created = await createInstituteWizardExam(page, uniqueSeed, studentScope);
      examId = created.examId;

      const initialAssignmentForm = await openAssignmentForm(page, examId);
      const assignmentModes = await readAssignmentModeOptions(initialAssignmentForm);
      expect(assignmentModes.length).toBeGreaterThan(0);
      expect(assignmentModes.some((option) => option.value === "selected_students")).toBe(true);
      expect(assignmentModes.some((option) => option.value === "scope")).toBe(true);

      for (const option of assignmentModes) {
        const assignmentForm = await openAssignmentForm(page, examId);
        await saveAssignmentMode(page, assignmentForm, option, studentScope.displayName);

        const persistedAssignmentForm = await openAssignmentForm(page, examId);
        await expect(persistedAssignmentForm.locator('select[name="assignment_mode"]')).toHaveValue(option.value);

        const detail = await fetchInstituteExamDetail(page, examId);
        expect(detail.assignment_mode).toBe(option.value);

        if (option.value === "selected_students") {
          expect(
            detail.assigned_students.some((student) =>
              student.full_name.toLowerCase().includes(studentScope.displayName.toLowerCase()),
            ),
          ).toBe(true);
        } else {
          expect(detail.assigned_students).toHaveLength(0);
        }

        await expectDetailAssignmentState(page, examId, studentScope.displayName, option);
      }
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
    }
  });
});
