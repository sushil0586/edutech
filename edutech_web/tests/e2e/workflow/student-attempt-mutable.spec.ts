import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
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

async function selectFirstNonEmptyOption(select: Locator) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        label: ((node as HTMLOptionElement).textContent ?? "").trim(),
        value: (node as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  if (options.length > 0) {
    await select.selectOption(options[0]!.value);
  }
}

async function selectFirstNonEmptyOptionWithLabel(select: Locator) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        label: ((node as HTMLOptionElement).textContent ?? "").trim(),
        value: (node as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await select.selectOption(options[0]!.value);
  return options[0]!;
}

async function waitForSelectableOption(locator: Locator) {
  await expect
    .poll(async () => {
      const options = await locator.locator("option").evaluateAll((nodes) =>
        nodes
          .map((node) => (node as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );
      return options.length;
    })
    .toBeGreaterThan(0);
}

async function ensureExamSubjectSelected(page: Page) {
  const examSubjectSelect = page.locator('select[name="subject"]');
  if (!(await examSubjectSelect.count())) {
    return;
  }
  const currentValue = await examSubjectSelect.inputValue().catch(() => "");
  if (currentValue.trim().length > 0) {
    return;
  }
  await selectFirstNonEmptyOption(examSubjectSelect);
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

async function runTeacherExamAction(page: Page, examId: string, action: "sync-marks" | "publish" | "mark-live") {
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/${action}/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    data: {},
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function expectTeacherExamStatus(page: Page, examId: string, expectedStatuses: string[]) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { data?: { status?: string | null } | null; status?: string | null };
  const status = payload.data?.status ?? payload.status ?? null;
  expect(status).not.toBeNull();
  expect(expectedStatuses).toContain(status!);
}

async function expectStudentStartAccess(page: Page, examId: string) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/${examId}/detail/`, {
    headers: {
      Authorization: `Bearer ${await backendAccessToken(page)}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const detail = (await response.json()) as {
    can_start?: boolean;
    availability_state?: string;
    start_access?: {
      is_allowed?: boolean;
      reason_source?: string;
      reason_code?: string;
      reason_message?: string;
    } | null;
  };
  expect(
    detail.start_access?.is_allowed,
    `Student start access blocked: ${detail.start_access?.reason_source ?? "unknown"} / ${detail.start_access?.reason_code ?? "unknown"} / ${detail.start_access?.reason_message ?? "unknown"} / availability=${detail.availability_state ?? "unknown"}`,
  ).toBe(true);
  expect(detail.can_start).toBe(true);
}

async function createDisposableTrueFalseQuestion(page: Page, programName: string, questionText: string) {

  await page.goto("/teacher/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');

  await selectOptionStartingWithLabel(programSelect, programName);
  await expect(subjectSelect).toBeEnabled();
  try {
    await waitForSelectableOption(subjectSelect);
  } catch {
    await selectFirstNonEmptyOption(programSelect);
    await expect(subjectSelect).toBeEnabled();
    await waitForSelectableOption(subjectSelect);
  }
  const subjectOption = await selectFirstNonEmptyOptionWithLabel(subjectSelect);
  await expect(topicSelect).toBeEnabled();
  const topicOptionCount = await topicSelect.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0).length,
  );
  if (topicOptionCount > 0) {
    await selectFirstNonEmptyOption(topicSelect);
  }

  await page.locator('select[name="question_type"]').selectOption("true_false");
  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page.locator('textarea[name="explanation"]').fill(
    "Disposable true/false prompt for student mutable attempt coverage.",
  );

  const optionRows = page.locator(".questionEditorOptionRow");
  await expect(optionRows).toHaveCount(2);
  await optionRows.first().locator('input[type="radio"]').check();
  await page.locator('input[name="default_marks"]').fill("4");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);

  return {
    questionText,
    subjectLabel: subjectOption.label,
  };
}

test.describe("Student mutable attempt actions", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "disposable student attempt coverage",
    ),
  );

  test("@workflow @mutable student can start, resume, switch sections, and submit a disposable teacher-assigned exam", async ({
    page,
  }) => {
    test.setTimeout(240000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let examId: string | null = null;
    let attemptId: string | null = null;
    const now = new Date();
    // Keep the exam window comfortably open across timezone/parsing differences
    // on shared stage environments so student-start coverage never depends on
    // minute-boundary or locale drift.
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const resultPublishAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const uniqueSeed = Date.now();
    let questionSubjectLabel = "";
    const questionTexts = [
      `PW student attempt question ${uniqueSeed}-1`,
      `PW student attempt question ${uniqueSeed}-2`,
    ];

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

    const examTitle = `PW Student Attempt ${uniqueSeed}`;
    const examCode = `PW-SA-${uniqueSeed}`;
    try {
      expect(studentProgramName).not.toBeNull();

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const createExamSubjectSelect = page.locator('select[name="subject"]');
      if (await createExamSubjectSelect.count()) {
        const subjectOptions = await createExamSubjectSelect.locator("option").evaluateAll((options) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        if (subjectOptions.length > 0) {
          await createExamSubjectSelect.selectOption(subjectOptions[0]!.value);
        }
      }

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(resultPublishAt));
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      for (const [index, currentQuestionText] of questionTexts.entries()) {
        const disposableQuestion = await createDisposableTrueFalseQuestion(page, studentProgramName!, currentQuestionText);
        if (index === 0) {
          questionSubjectLabel = disposableQuestion.subjectLabel;
        }
      }

      await page.goto(`/teacher/exams/${examId}/builder`);
      const academicYearSelect = page.locator('select[name="academic_year"]');
      const examProgramSelect = page.locator('select[name="program"]');
      const examSubjectSelect = page.locator('select[name="subject"]');
      if (studentAcademicYearName && await academicYearSelect.count()) {
        await selectOptionByLabel(academicYearSelect, studentAcademicYearName);
      }
      if (studentProgramName && await examProgramSelect.count()) {
        await selectOptionStartingWithLabel(examProgramSelect, studentProgramName);
      }
      if (questionSubjectLabel && await examSubjectSelect.count()) {
        await selectOptionStartingWithLabel(examSubjectSelect, questionSubjectLabel);
      } else {
        await ensureExamSubjectSelected(page);
      }
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}/builder?tab=sections`);
      await expect(page.getByText(/add a new section/i).first()).toBeVisible();

      const sectionForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/add a new section/i),
      }).first();
      await sectionForm.getByRole("textbox", { name: /section name/i }).fill("Section Alpha");
      await sectionForm.locator('input[name="section_order"]').fill("1");
      await sectionForm.getByRole("button", { name: /add section/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section added\./i)).toBeVisible();

      await sectionForm.getByRole("textbox", { name: /section name/i }).fill("Section Beta");
      await sectionForm.locator('input[name="section_order"]').fill("2");
      await sectionForm.getByRole("button", { name: /add section/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      const sectionRows = page.locator(".builderListRow");
      await expect(sectionRows).toHaveCount(2);
      const sectionIds = await sectionRows.locator('input[name="section_id"]').evaluateAll((inputs) =>
        inputs
          .map((input) => (input as HTMLInputElement).value)
          .filter((value) => value.trim().length > 0),
      );
      expect(sectionIds.length).toBeGreaterThanOrEqual(2);

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const firstQuestionOption = await questionSelect.locator("option").evaluateAll((options, expectedQuestionText) =>
        options
          .map((option) => ({
            label: (option as HTMLOptionElement).label,
            value: (option as HTMLOptionElement).value,
          }))
          .find(
            (option) =>
              option.value.trim().length > 0 &&
              option.label.toLowerCase().includes(String(expectedQuestionText).toLowerCase()),
          ) ?? null,
        questionTexts[0],
      );
      expect(firstQuestionOption).not.toBeNull();
      await questionSelect.selectOption(firstQuestionOption!.value);
      await manualAttachForm.locator('select[name="section"]').selectOption(sectionIds[0]!);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();
      await expect(page.locator(".builderQuestionCard")).toHaveCount(1);

      const secondQuestionOption = await questionSelect.locator("option").evaluateAll((options, expectedQuestionText) =>
        options
          .map((option) => ({
            label: (option as HTMLOptionElement).label,
            value: (option as HTMLOptionElement).value,
          }))
          .find(
            (option) =>
              option.value.trim().length > 0 &&
              option.label.toLowerCase().includes(String(expectedQuestionText).toLowerCase()),
          ) ?? null,
        questionTexts[1],
      );
      expect(secondQuestionOption).not.toBeNull();
      await questionSelect.selectOption(secondQuestionOption!.value);
      await manualAttachForm.locator('select[name="section"]').selectOption(sectionIds[1]!);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("2");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.locator(".builderQuestionCard")).toHaveCount(2);

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('.selectionList input[type="checkbox"]');
      await expect
        .poll(async () => await studentCheckboxes.count(), {
          timeout: 15000,
        })
        .toBeGreaterThan(0);
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[type="checkbox"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder`);
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      await runTeacherExamAction(page, examId!, "sync-marks");
      await runTeacherExamAction(page, examId!, "publish");
      await runTeacherExamAction(page, examId!, "mark-live");
      await expectTeacherExamStatus(page, examId!, ["scheduled", "live"]);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expectStudentStartAccess(page, examId!);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const startButton = page.getByRole("button", {
        name: /^(start|start (mock test|practice set|exam))$/i,
      });
      await expect(startButton).toBeVisible();
      await startButton.click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();
      const currentQuestionCard = page.locator("article").filter({
        has: page.getByText(/^question 1$/i),
      }).first();
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
      await expect(page.getByText(/attempt progress/i).first()).toBeVisible();
      await expect(currentQuestionCard.getByText(/last save check/i)).toBeVisible();
      await expect(page.getByText(/save & recovery status/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /current section|open section/i }).first(),
      ).toBeVisible();

      await answerCurrentAttemptQuestion(page, uniqueSeed);

      await page.getByRole("checkbox", { name: /mark for review/i }).check();
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.locator(".feedbackBannerSuccess").filter({
        hasText: /response updated successfully/i,
      }).first()).toBeVisible();
      await expect(page.getByText(/1 saved/i).first()).toBeVisible();
      await expect(page.getByText(/responses saved/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed save/i).first()).toBeVisible();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
      await expect(
        page.getByText(/your latest confirmed sync reached the backend|continue steadily and use save answer after changes/i).first(),
      ).toBeVisible();

      const firstSavedAt = (
        await page.locator(".attemptToolbar .examStateSummary").filter({
          has: page.getByText(/^last confirmed save$/i),
        }).locator("strong").first().textContent()
      )?.trim();
      expect(firstSavedAt).toBeTruthy();

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^resume$/i })).toBeVisible();
      await expect(page.getByText(/active attempt already exists/i).first()).toBeVisible();
      await page.getByRole("link", { name: /^resume$/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));

      const sectionCards = page.locator(".attemptSectionCard");
      await expect(sectionCards).toHaveCount(2);
      const nextSectionCard = sectionCards.filter({
        has: page.getByText(/section beta/i),
      }).first();
      await expect(nextSectionCard.getByRole("button", { name: /open section/i })).toBeVisible();
      await nextSectionCard.getByRole("button", { name: /open section/i }).click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      const sectionBetaQuestionCard = page.locator("article").filter({
        has: page.getByText(/^section beta$/i),
      }).first();
      await expect(sectionBetaQuestionCard).toBeVisible();
      await expect(sectionBetaQuestionCard.getByText(/^question 1$/i)).toBeVisible();

      const afterSwitchSavedAt = (
        await page.locator(".attemptToolbar .examStateSummary").filter({
          has: page.getByText(/^last confirmed save$/i),
        }).locator("strong").first().textContent()
      )?.trim();
      expect(afterSwitchSavedAt).toBe(firstSavedAt);

      await answerCurrentAttemptQuestion(page, uniqueSeed + 1);
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
      await expect(page.getByText(/attempt status/i)).toBeVisible();
      await expect(page.getByText(/review/i).first()).toBeVisible();
      await expect(
        page.getByText(/instant feedback ready|review ready|review feedback/i).first(),
      ).toBeVisible();

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open summary/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
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
