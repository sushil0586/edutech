import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { assignStudentToExam } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectStudentWorkspace, expectTeacherWorkspace } from "../helpers/navigation";

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

async function openTeacherExamBuilderReady(page: Page, examId: string, tab?: "questions") {
  const builderPath = `/teacher/exams/${examId}/builder${tab ? `?tab=${tab}` : ""}`;
  const loadIssueHeading = page.getByRole("heading", { name: /exam builder could not be loaded/i });

  await expect
    .poll(
      async () => {
        await page.goto(builderPath, { waitUntil: "domcontentloaded" });

        if (await loadIssueHeading.isVisible().catch(() => false)) {
          return "load-issue";
        }

        if (tab === "questions") {
          return (await page.getByText(/attach one question manually/i).first().isVisible().catch(() => false))
            ? "ready"
            : "pending";
        }

        return (await page.getByRole("button", { name: /save exam settings/i }).isVisible().catch(() => false))
          ? "ready"
          : "pending";
      },
      {
        timeout: 45000,
        intervals: [1000, 2000, 3000, 5000],
      },
    )
    .toBe("ready");
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
    student_profile?: string | null;
    student_context?: {
      academic_year_name?: string | null;
      program_name?: string | null;
    } | null;
  };

  return {
    studentDisplayName,
    studentProfileId: studentPayload.student_profile?.trim() ?? null,
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
    start_access?: {
      is_allowed?: boolean;
      reason_message?: string;
    } | null;
  };
  expect(detail.start_access?.is_allowed, detail.start_access?.reason_message ?? "Student start access blocked.").toBe(
    true,
  );
  expect(detail.can_start).toBe(true);
}

async function createDisposableDescriptiveQuestion(page: Page, programName: string, questionText: string) {
  await page.goto("/teacher/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');

  await selectOptionStartingWithLabel(programSelect, programName);
  await expect(subjectSelect).toBeEnabled();
  await waitForSelectableOption(subjectSelect);
  const subjectOption = await selectFirstNonEmptyOption(subjectSelect);

  if (await topicSelect.count()) {
    await expect(topicSelect).toBeEnabled();
    const topicOptions = await topicSelect.locator("option").evaluateAll((nodes) =>
      nodes
        .map((node) => (node as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    if (topicOptions.length > 0) {
      await topicSelect.selectOption(topicOptions[0]!);
    }
  }

  await page.locator('select[name="question_type"]').selectOption("essay_manual_review");
  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page
    .locator('textarea[name="explanation"]')
    .fill("Disposable descriptive prompt for student runtime coverage.");
  await page
    .locator('textarea[name="review_guidance"]')
    .fill("Reward a clear explanation with one relevant example.");
  await page.locator('input[name="default_marks"]').fill("10");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);

  return {
    questionText,
    subjectLabel: subjectOption.label,
  };
}

test.describe("Student descriptive runtime actions", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "descriptive student runtime coverage",
    ),
  );

  test("@workflow @mutable student can answer a descriptive exam through the runtime UI and resume with saved text intact", async ({
    page,
  }) => {
    test.setTimeout(240000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let examId: string | null = null;
    let attemptId: string | null = null;
    const now = new Date();
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const uniqueSeed = Date.now();
    const questionText = `PW student descriptive runtime question ${uniqueSeed}`;
    const answerText = `descriptive learner answer ${uniqueSeed}`;
    const examTitle = `PW Student Descriptive Runtime ${uniqueSeed}`;
    const examCode = `PW-SDR-${uniqueSeed}`;
    let questionSubjectLabel = "";

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    const studentContext = await readStudentAcademicContext(page);
    studentProfileId = studentContext.studentProfileId;
    studentAcademicYearName = studentContext.studentAcademicYearName;
    studentProgramName = studentContext.studentProgramName;

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    try {
      expect(studentProgramName).not.toBeNull();
      expect(studentProfileId).not.toBeNull();

      const descriptiveQuestion = await createDisposableDescriptiveQuestion(page, studentProgramName!, questionText);
      questionSubjectLabel = descriptiveQuestion.subjectLabel;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /create exam shell|creating exam/i }).click();
      await expect
        .poll(() => page.url(), { timeout: 30000 })
        .toMatch(/\/teacher\/exams\/(?!new(?:[/?#]|$))[^/?#]+\/builder(?:\?message=.*)?$/);

      examId = page.url().split("?")[0]?.match(/\/teacher\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBe("new");
      expect(examId).not.toBeNull();

      await openTeacherExamBuilderReady(page, examId!);
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
      }
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?message=.*)?$`));

      await openTeacherExamBuilderReady(page, examId!, "questions");
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const targetQuestionOption = await questionSelect.locator("option").evaluateAll((options, expectedQuestionText) =>
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
        questionText,
      );
      expect(targetQuestionOption).not.toBeNull();
      await questionSelect.selectOption(targetQuestionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("10");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions(?:&|.*\?)message=|tab=questions.*message=/);
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();

      await assignStudentToExam(page, examId!, studentProfileId!);

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await runTeacherExamAction(page, examId!, "sync-marks");
      await runTeacherExamAction(page, examId!, "publish");
      await runTeacherExamAction(page, examId!, "mark-live");

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expectStudentStartAccess(page, examId!);

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page.getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.locator('textarea[name="answer_text"]:visible').first()).toBeVisible();

      await answerCurrentAttemptQuestion(page, uniqueSeed, "descriptive learner answer");
      await page.getByRole("checkbox", { name: /mark for review/i }).check();
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
      await expect(page.getByText(/responses saved|save & recovery status/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed save|last confirmed action/i).first()).toBeVisible();

      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.locator('textarea[name="answer_text"]:visible').first()).toHaveValue(answerText);
      await expect(page.getByRole("checkbox", { name: /mark for review/i })).not.toBeDisabled();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$|^end test$/i }).click();

      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`));
      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
      await expect(page.getByText(/evaluation pending/i).first()).toBeVisible();
      await expect(page.getByText(/review availability|review locked|review depends on/i).first()).toBeVisible();

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("link", { name: /open summary/i }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
    } finally {
      if (examId && !page.isClosed()) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
