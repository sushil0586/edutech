import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Locator as PlaywrightLocator } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { resolveBackendBaseUrl } from "../helpers/backend-base-url";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";
import { resolveStudentProfileScope } from "../helpers/student-scope";

const mutableStudentResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);
const backendBaseUrl = resolveBackendBaseUrl();

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function selectFirstNonEmptyOption(page: Page, selector: string) {
  const locator = page.locator(selector);
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const value = values.find((option) => option.trim().length > 0) ?? null;
  expect(value).not.toBeNull();
  await locator.selectOption(value!);
}

async function waitForSelectableOption(locator: PlaywrightLocator) {
  await expect
    .poll(
      async () =>
        await locator.locator("option").evaluateAll((nodes) =>
          nodes
            .map((node) => (node as HTMLOptionElement).value)
            .filter((value) => value.trim().length > 0).length,
        ),
      { timeout: 10000 },
    )
    .toBeGreaterThan(0);
}

async function selectOptionStartingWithLabel(locator: PlaywrightLocator, labelFragment: string) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        label: ((node as HTMLOptionElement).label || (node as HTMLOptionElement).textContent || "").trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  const match =
    options.find((option) => option.label.toLowerCase().startsWith(labelFragment.trim().toLowerCase())) ??
    options.find((option) => option.label.toLowerCase().includes(labelFragment.trim().toLowerCase())) ??
    null;
  expect(match).not.toBeNull();
  await locator.selectOption(match!.value);
  return match!;
}

async function selectOptionExactLabel(locator: PlaywrightLocator, expectedLabel: string) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        label: ((node as HTMLOptionElement).label || (node as HTMLOptionElement).textContent || "").trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  const normalizedExpected = expectedLabel.trim().toLowerCase();
  const match =
    options.find((option) => option.label.toLowerCase() === normalizedExpected) ??
    options.find((option) => option.label.toLowerCase().includes(normalizedExpected)) ??
    null;
  expect(match).not.toBeNull();
  await locator.selectOption(match!.value);
  return match!;
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
    await selectFirstNonEmptyOption(page, 'select[name="program"]');
    await expect(subjectSelect).toBeEnabled();
    await waitForSelectableOption(subjectSelect);
  }
  const subjectOption = await subjectSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label || (option as HTMLOptionElement).textContent || "",
      }))
      .find((option) => option.value.trim().length > 0) ?? null,
  );
  expect(subjectOption).not.toBeNull();
  await subjectSelect.selectOption(subjectOption!.value);

  const topicOptionCount = await topicSelect.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0).length,
  );
  if (topicOptionCount > 0) {
    await selectFirstNonEmptyOption(page, 'select[name="topic"]');
  }

  await page.locator('select[name="question_type"]').selectOption("true_false");
  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page.locator('textarea[name="explanation"]').fill(
    "Disposable explanation for student results publication coverage.",
  );

  const optionRows = page.locator(".questionEditorOptionRow");
  await expect(optionRows).toHaveCount(2);
  await optionRows.first().locator('input[type="radio"]').check();
  await page.locator('input[name="default_marks"]').fill("4");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
  const questionDetailUrl = page.url().split("?")[0] ?? page.url();
  const questionIdMatch = questionDetailUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
  const questionId = questionIdMatch?.[1] ?? null;
  expect(questionId).not.toBeNull();

  return {
    questionId: questionId!,
    subjectLabel: subjectOption!.label,
  };
}

async function expectOneOf(primary: Locator, secondary: Locator) {
  const primaryVisible = await primary.isVisible().catch(() => false);
  if (primaryVisible) {
    await expect(primary).toBeVisible();
    return;
  }
  await expect(secondary).toBeVisible();
}

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

function resultRowByTitle(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(title, "i") }).first();
}

async function getCurrentSessionAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function requestBackendJson<T>(
  page: Page,
  path: string,
  init?: {
    method?: "GET" | "POST" | "PATCH";
    accessToken?: string;
    data?: Record<string, unknown>;
  },
) {
  const accessToken = (init?.accessToken ?? (await getCurrentSessionAccessToken(page))).trim();
  expect(accessToken).not.toBe("");

  const response = await page.request.fetch(`${backendBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: init?.data,
    timeout: 15000,
  });

  const bodyText = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  const payload =
    bodyText && contentType.includes("application/json")
      ? (JSON.parse(bodyText) as T)
      : (null as T);
  return { response, payload, bodyText };
}

async function teacherApiRequest(
  page: Page,
  path: string,
  options?: {
    method?: "DELETE";
  },
) {
  const teacherCredentials = getRoleCredentials("teacher");
  expect(teacherCredentials).not.toBeNull();

  const loginResponse = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
    data: {
      username: teacherCredentials!.username,
      password: teacherCredentials!.password,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(loginResponse.ok(), await loginResponse.text()).toBe(true);
  const loginPayload = (await loginResponse.json()) as { access?: string };
  const accessToken = loginPayload.access?.trim() ?? "";
  expect(accessToken).not.toBe("");

  return await page.request.fetch(`${backendBaseUrl}${path}`, {
    method: options?.method ?? "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
}

async function startAttemptViaApi(page: Page, examId: string, studentProfileId: string) {
  const startResponse = await requestBackendJson<{
    data?: {
      id?: string;
    };
  }>(page, "/api/v1/attempts/start/", {
    method: "POST",
    data: {
      exam: examId,
      student: studentProfileId,
    },
  });
  expect(startResponse.response.ok(), startResponse.bodyText).toBe(true);
  const attemptId = startResponse.payload?.data?.id?.trim() ?? "";
  expect(attemptId).not.toBe("");
  await page.goto(`/app/attempts/${attemptId}`);
  await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
  return attemptId;
}

async function publishExamResults(page: Page, examId: string) {
  const markCompletedResponse = await requestBackendJson(page, `/api/v1/exams/${examId}/mark-completed/`, {
    method: "POST",
    data: {
      remarks: "Playwright student disposable result publication coverage",
    },
  });
  expect(markCompletedResponse.response.ok(), markCompletedResponse.bodyText).toBe(true);

  const generateResultsResponse = await requestBackendJson(page, "/api/v1/results/generate-for-exam/", {
    method: "POST",
    data: {
      exam: examId,
    },
  });
  expect(generateResultsResponse.response.ok(), generateResultsResponse.bodyText).toBe(true);

  const calculateRanksResponse = await requestBackendJson(page, "/api/v1/results/calculate-ranks/", {
    method: "POST",
    data: {
      exam: examId,
    },
  });
  expect(calculateRanksResponse.response.ok(), calculateRanksResponse.bodyText).toBe(true);

  const publishResultsResponse = await requestBackendJson(page, "/api/v1/results/publish-exam-results/", {
    method: "POST",
    data: {
      exam: examId,
    },
  });
  expect(publishResultsResponse.response.ok(), publishResultsResponse.bodyText).toBe(true);
}

async function makeExamStartable(page: Page, examId: string, startAt: Date, endAt: Date) {
  const deliveryUpdate = await requestBackendJson<Record<string, unknown>>(page, `/api/v1/exams/${examId}/`, {
    method: "PATCH",
    data: {
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      total_marks: "4.00",
      passing_marks: "1.00",
      attempt_policy: "single",
      result_publish_mode: "immediate",
      review_mode: "attempted_only",
      allow_review_after_submit: true,
      show_result_immediately: false,
    },
  });
  expect(deliveryUpdate.response.ok(), deliveryUpdate.bodyText).toBe(true);

  const publishResponse = await requestBackendJson<Record<string, unknown>>(
    page,
    `/api/v1/exams/${examId}/publish/`,
    {
      method: "POST",
      data: {
        remarks: "Playwright disposable result publication coverage",
      },
    },
  );
  expect(publishResponse.response.ok(), publishResponse.bodyText).toBe(true);

  const markLiveResponse = await requestBackendJson<Record<string, unknown>>(
    page,
    `/api/v1/exams/${examId}/mark-live/`,
    {
      method: "POST",
      data: {
        remarks: "Playwright disposable result publication coverage",
      },
    },
  );
  expect(markLiveResponse.response.ok(), markLiveResponse.bodyText).toBe(true);
}

test.describe("Student mutable results publication", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
      "disposable student results publication coverage",
    ),
  );

  test("@workflow @mutable student can see a guaranteed published disposable result in grouped outcome views", async ({
    page,
  }) => {
    test.setTimeout(240000);
    const startedAt = Date.now();
    const cleanupBudgetMs = 25000;

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let questionId: string | null = null;
    let examId: string | null = null;
    let studentProgramName: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProfileId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW student results question ${uniqueSeed}`;
    const examTitle = `PW Student Results ${uniqueSeed}`;
    const examCode = `PW-SR-${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      const studentScope = await resolveStudentProfileScope(page);
      if (studentScope.displayName) {
        studentDisplayName = studentScope.displayName;
      }
      studentProgramName = studentScope.programName;
      studentAcademicYearName = studentScope.academicYearName;
      const studentMe = await requestBackendJson<{
        student_profile?: string | null;
      }>(page, "/api/v1/auth/me/");
      studentProfileId = studentMe.payload?.student_profile?.trim() ?? null;
      expect(studentProfileId).not.toBeNull();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      expect(studentProgramName).not.toBeNull();
      const disposableQuestion = await createDisposableTrueFalseQuestion(page, studentProgramName!, questionText);
      questionId = disposableQuestion.questionId;

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = examDetailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const targetQuestionOption = await questionSelect.locator("option").evaluateAll(
        (options, expectedQuestionText) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
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
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('.selectionList input[type="checkbox"]');
      let studentCount = 0;
      try {
        await expect
          .poll(async () => await studentCheckboxes.count(), {
            timeout: 15000,
          })
          .toBeGreaterThan(0);
        studentCount = await studentCheckboxes.count();
      } catch {
        studentCount = await studentCheckboxes.count();
      }

      if (studentCount > 0) {
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
      } else {
        await assignmentForm.locator('select[name="assignment_mode"]').selectOption("scope");
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);

      await page.goto(`/teacher/exams/${examId}/builder`);
      const academicYearSelect = page.locator('select[name="academic_year"]');
      if (studentAcademicYearName && await academicYearSelect.count()) {
        await selectOptionExactLabel(academicYearSelect, studentAcademicYearName);
      }
      const programSelect = page.locator('select[name="program"]');
      if (studentProgramName && await programSelect.count()) {
        await selectOptionStartingWithLabel(programSelect, studentProgramName);
      }
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("4");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await makeExamStartable(page, examId!, startAt, endAt);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      const attemptId = await startAttemptViaApi(page, examId!, studentProfileId!);
      await answerCurrentAttemptQuestion(page, uniqueSeed, "Playwright student published result answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expectOneOf(
        page.locator(".feedbackBannerSuccess").filter({
          hasText: /response updated successfully/i,
        }).first(),
        page.getByText(/1 saved/i).first(),
      );

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^(submit test|end test)$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await publishExamResults(page, examId!);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome");
            const resultRow = resultRowByTitle(page, examTitle);
            return resultRow.isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=outcome/);
      await expect(page.getByText(/group: outcome/i).first()).toBeVisible();

      const resultRow = resultRowByTitle(page, examTitle);
      await expect(resultRow).toBeVisible();
      await expect(page.getByText(/result published · pass|result published · fail/i).first()).toBeVisible();
      await resultRow.click();

      const resultDialog = page.getByRole("dialog");
      await expect(resultDialog).toBeVisible();
      await expect(resultDialog.getByText(new RegExp(examTitle, "i")).first()).toBeVisible();
      await expect(resultDialog.getByText(/published/i).first()).toBeVisible();

      const summaryLink = resultDialog.getByRole("link", {
        name: /open summary/i,
      }).first();
      await expect(summaryLink).toBeVisible();
      await summaryLink.click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary(?:\\?.*)?$`));
      await expect(page.getByRole("heading", { name: new RegExp(`${examTitle}\\s+Summary`, "i") }).first()).toBeVisible();
      await expect(page.getByText(/attempt status/i).first()).toBeVisible();
      await expect(page.getByText(/result published/i).first()).toBeVisible();
    } finally {
      const elapsedMs = Date.now() - startedAt;
      const shouldSkipCleanup = elapsedMs >= 240000 - cleanupBudgetMs;
      if (shouldSkipCleanup) {
        return;
      }
      if (questionId) {
        const deleteQuestionResponse = await teacherApiRequest(
          page,
          `/api/teacher/question-bank/questions/${questionId}`,
          {
            method: "DELETE",
          },
        );
        void deleteQuestionResponse;
      }
      if (examId) {
        const deleteExamResponse = await teacherApiRequest(page, `/api/teacher/exams/${examId}`, {
          method: "DELETE",
        });
        void deleteExamResponse;
      }
    }
  });
});
