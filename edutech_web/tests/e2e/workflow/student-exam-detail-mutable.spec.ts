import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { loginAsRole, loginWithCredentials, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentExamDetailActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function readStudentAcademicContext(page: Page) {
  let studentDisplayName = "";
  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
  const identityCard = page.locator(".detailCard").filter({
    has: page.getByText(/^name$/i),
  }).first();
  if (await identityCard.count()) {
    studentDisplayName = (await identityCard.locator("strong").first().textContent())?.trim() ?? "";
  }

  const studentMe = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(studentMe.ok()).toBe(true);
  const studentPayload = (await studentMe.json()) as {
    student_context?: {
      academic_year_name?: string | null;
      program_name?: string | null;
    } | null;
  };

  return {
    studentDisplayName,
    studentAcademicYearName: studentPayload.student_context?.academic_year_name?.trim() ?? null,
    studentProgramName: studentPayload.student_context?.program_name?.trim() ?? null,
  };
}

async function alignExamToStudentContext(page: Page, examId: string, academicYearName: string | null, programName: string | null) {
  await page.goto(`/teacher/exams/${examId}/builder`);
  const academicYearSelect = page.locator('select[name="academic_year"]');
  const examProgramSelect = page.locator('select[name="program"]');
  const examSubjectSelect = page.locator('select[name="subject"]');
  if (academicYearName && await academicYearSelect.count()) {
    await selectOptionByLabel(academicYearSelect, academicYearName);
  }
  if (programName && await examProgramSelect.count()) {
    await selectOptionStartingWithLabel(examProgramSelect, programName);
  }
  if (await examSubjectSelect.count()) {
    const currentValue = await examSubjectSelect.inputValue().catch(() => "");
    if (currentValue.trim().length === 0) {
      const options = await examSubjectSelect.locator("option").evaluateAll((nodes) =>
        nodes
          .map((node) => ({
            value: (node as HTMLOptionElement).value,
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      if (options.length > 0) {
        await examSubjectSelect.selectOption(options[0]!.value);
      }
    }
  }
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
}

async function selectOptionByLabel(select: Locator, label: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: (node as HTMLOptionElement).label.trim(),
      text: ((node as HTMLOptionElement).textContent ?? "").trim(),
      value: (node as HTMLOptionElement).value,
    })),
  );
  const match = options.find(
    (option) => option.value.trim().length > 0 && (option.label === label || option.text === label),
  );
  expect(match, `Expected to find option labeled "${label}".`).toBeTruthy();
  await select.selectOption(match!.value);
}

async function selectOptionStartingWithLabel(select: Locator, labelPrefix: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: (node as HTMLOptionElement).label.trim(),
      text: ((node as HTMLOptionElement).textContent ?? "").trim(),
      value: (node as HTMLOptionElement).value,
    })),
  );
  const loweredPrefix = labelPrefix.trim().toLowerCase();
  const match = options.find(
    (option) =>
      option.value.trim().length > 0 &&
      (option.label.toLowerCase().startsWith(loweredPrefix) || option.text.toLowerCase().startsWith(loweredPrefix)),
  );
  expect(match, `Expected to find option starting with "${labelPrefix}".`).toBeTruthy();
  await select.selectOption(match!.value);
}

test.describe("Student mutable exam detail blocked-state flow", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentExamDetailActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "disposable student exam-detail blocked-state coverage",
    ),
  );

  test("@workflow @mutable student sees truthful upcoming guidance on exam detail before the window opens", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() + 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const studentContext = await readStudentAcademicContext(page);
      if (studentContext.studentDisplayName) {
        studentDisplayName = studentContext.studentDisplayName;
      }
      studentAcademicYearName = studentContext.studentAcademicYearName;
      studentProgramName = studentContext.studentProgramName;

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Upcoming ${uniqueSeed}`;
      const examCode = `PW-DU-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await alignExamToStudentContext(page, examId!, studentAcademicYearName, studentProgramName);

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/this .* has been assigned, but the window is not open yet/i).first()).toBeVisible();
      await expect(
        page.getByText(/refresh the page after any schedule, assignment, or subscription change/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/attempts left/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /not available yet/i })).toBeDisabled();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open review/i })).toHaveCount(0);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable student sees truthful closed-window guidance on exam detail after the window ends", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const studentContext = await readStudentAcademicContext(page);
      if (studentContext.studentDisplayName) {
        studentDisplayName = studentContext.studentDisplayName;
      }
      studentAcademicYearName = studentContext.studentAcademicYearName;
      studentProgramName = studentContext.studentProgramName;

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Closed ${uniqueSeed}`;
      const examCode = `PW-DC-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await alignExamToStudentContext(page, examId!, studentAcademicYearName, studentProgramName);

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/this exam window has already closed/i).first()).toBeVisible();
      await expect(page.getByText(/exam is no longer available for attempts/i).first()).toBeVisible();
      await expect(page.getByText(/policy code: after window/i).first()).toBeVisible();
      await expect(page.getByText(/attempts left/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /not available yet/i })).toBeDisabled();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open review/i })).toHaveCount(0);

      await page.getByRole("link", { name: /back to exams/i }).click();
      await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable student sees star-locked guidance and wallet handoff on exam detail", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let examId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const starCost = "7";

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const studentContext = await readStudentAcademicContext(page);
      if (studentContext.studentDisplayName) {
        studentDisplayName = studentContext.studentDisplayName;
      }
      studentAcademicYearName = studentContext.studentAcademicYearName;
      studentProgramName = studentContext.studentProgramName;

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      const uniqueSeed = Date.now();
      const examTitle = `PW Detail Stars ${uniqueSeed}`;
      const examCode = `PW-DS-${uniqueSeed}`;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await alignExamToStudentContext(page, examId!, studentAcademicYearName, studentProgramName);

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({ value: (option as HTMLOptionElement).value }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const accessPolicySelect = page.getByRole("combobox", { name: /access policy/i });
      const starOption = await accessPolicySelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            label: option.textContent?.trim() ?? "",
            value: (option as HTMLOptionElement).value,
          }))
          .find(
            (option) =>
              /star/i.test(option.label) &&
              !/either/i.test(option.label),
          ) ?? null,
      );
      expect(starOption).not.toBeNull();
      await accessPolicySelect.selectOption(starOption!.value);
      await page.getByRole("spinbutton", { name: /star cost/i }).fill(starCost);
      await page.getByRole("textbox", { name: /entitlement code/i }).fill("");
      await page.getByRole("button", { name: /save access policy/i }).click();
      await expect(page.getByText(/exam access policy updated successfully/i)).toBeVisible();
      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.count()) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.count()) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginWithCredentials(page, studentCredentials!, "student");
      await expectStudentWorkspace(page);

      await page.goto(`/app/exams/${examId}`);
      await expect(page).toHaveURL(new RegExp(`/app/exams/${examId}(?:\\?.*)?$`));
      await expect(page.getByText(/exam readiness/i).first()).toBeVisible();
      await expect(page.getByText(/unlock this .* before starting/i).first()).toBeVisible();
      await expect(
        page.getByText(new RegExp(`${starCost} stars are required before this .* can be started`, "i")).first(),
      ).toBeVisible();
      await expect(page.getByText(/unlock happens before any attempt can begin/i).first()).toBeVisible();
      await expect(page.getByText(/once unlocked, you return to this same detail page/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: new RegExp(`unlock with ${starCost} stars`, "i") })).toBeVisible();
      await expect(page.getByRole("link", { name: /open wallet/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /open summary/i })).toHaveCount(0);

      await page.getByRole("link", { name: /open wallet/i }).click();
      await expect(page).toHaveURL(/\/app\/wallet(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /wallet/i }).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
