import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { assignStudentToExam } from "../helpers/family-runtime";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableInstituteResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);

const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

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

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  }).first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = values.find((value) => value.trim().length > 0) ?? null;
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function waitForSelectableOption(locator: Locator) {
  await expect
    .poll(async () => {
      const values = await locator.locator("option").evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value.trim()),
      );
      return values.some((value) => value.length > 0);
    })
    .toBe(true);
}

async function selectOptionByLabel(locator: Locator, label: string) {
  const optionValue = await locator.locator("option").evaluateAll(
    (options, expectedLabel) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label,
        }))
        .find(
          (option) =>
            option.value.trim().length > 0 &&
            option.label.trim().toLowerCase() === String(expectedLabel).trim().toLowerCase(),
        )?.value ?? null,
    label,
  );
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function selectOptionStartingWithLabel(locator: Locator, label: string) {
  const optionValue = await locator.locator("option").evaluateAll(
    (options, expectedLabel) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label,
        }))
        .find(
          (option) =>
            option.value.trim().length > 0 &&
            option.label.trim().toLowerCase().startsWith(String(expectedLabel).trim().toLowerCase()),
        )?.value ?? null,
    label,
  );
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
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
    method?: "GET" | "POST";
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
  });

  const bodyText = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  const payload =
    bodyText && contentType.includes("application/json")
      ? (JSON.parse(bodyText) as T)
      : (null as T);
  return { response, payload, bodyText, contentType };
}

async function waitForReviewTaskInQueue(page: Page, examId: string) {
  const instituteAccessToken = await getCurrentSessionAccessToken(page);

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await page.request.get(`${backendBaseUrl}/api/v1/attempts/review-tasks/?exam=${examId}`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
    });

    if (response.ok()) {
      const payload = (await response.json().catch(() => null)) as
        | { results?: Array<{ id?: string }> }
        | null;
      const taskId = payload?.results?.find((task) => typeof task?.id === "string" && task.id.trim().length > 0)?.id ?? null;
      if (taskId) {
        return taskId;
      }
    }

    await page.goto(`/institute/reviews?exam=${examId}`);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await page.waitForTimeout(2000);
  }

  return null;
}

async function deleteInstituteExam(page: Page, examId: string) {
  const accessToken = await getCurrentSessionAccessToken(page);

  try {
    const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
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
    // Fall back to the web proxy route used elsewhere in the suite.
  }

  const proxyResponse = await page.request.delete(`/api/institute/exams/${examId}`, {
    timeout: 15000,
  });
  expect(proxyResponse.ok()).toBe(true);
}

test.describe("Student mutable descriptive analytics continuity", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "student descriptive analytics continuity coverage",
    ),
  );

  test("@workflow @mutable student analytics stays truthful after descriptive manual review publication", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentSubjectName: string | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;
    let studentAttemptId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW student descriptive analytics question ${uniqueSeed}`;
    const examTitle = `PW Student Descriptive Analytics ${uniqueSeed}`;
    const examCode = `PW-SDA-${uniqueSeed}`;
    const answerText = `This is a descriptive analytics answer ${uniqueSeed}.`;
    const awardedMarks = "8.00";
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const studentMe = await requestBackendJson<{
        student_profile?: string | null;
        student_context?: {
          academic_year_name?: string;
          program_name?: string;
          subject_options?: Array<{ label?: string }>;
        } | null;
      }>(page, "/api/v1/auth/me/");
      studentProfileId = studentMe.payload?.student_profile?.trim() ?? null;
      expect(studentProfileId).not.toBeNull();
      studentAcademicYearName = studentMe.payload?.student_context?.academic_year_name?.trim() ?? null;
      studentProgramName = studentMe.payload?.student_context?.program_name?.trim() ?? null;
      studentSubjectName =
        studentMe.payload?.student_context?.subject_options?.find((item) => item.label?.trim())?.label?.trim() ??
        null;
      expect(studentAcademicYearName).not.toBeNull();
      expect(studentProgramName).not.toBeNull();
      expect(studentSubjectName).not.toBeNull();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');

      await selectOptionByLabel(programSelect, studentProgramName!);
      await expect(subjectSelect).toBeEnabled();
      await waitForSelectableOption(subjectSelect);
      await selectOptionByLabel(subjectSelect, studentSubjectName!);
      await expect(topicSelect).toBeEnabled();
      await waitForSelectableOption(topicSelect);
      await selectFirstNonEmptyOption(topicSelect);
      await questionTypeSelect.selectOption("essay_manual_review");

      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright descriptive explanation for student analytics continuity coverage.");
      await page
        .locator('textarea[name="review_guidance"]')
        .fill("Award strong marks when the learner explains the idea clearly with one concrete example.");
      await page.locator('input[name="default_marks"]').fill("10");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);

      const questionDetailUrl = page.url().split("?")[0] ?? page.url();
      questionId = questionDetailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.goto("/institute/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);

      const examDetailUrl = page.url().split("?")[0] ?? page.url();
      examId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder`);
      const academicYearSelect = page.locator('select[name="academic_year"]');
      const examProgramSelect = page.locator('select[name="program"]');
      await selectOptionByLabel(academicYearSelect, studentAcademicYearName!);
      await selectOptionStartingWithLabel(examProgramSelect, studentProgramName!);
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
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
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("10");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);

      await assignStudentToExam(page, examId!, studentProfileId!);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("10");
      await page.locator('input[name="passing_marks"]').fill("4");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/institute/exams/${examId}`);
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
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
        .click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      const attemptUrl = page.url().split("?")[0] ?? page.url();
      studentAttemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(studentAttemptId).not.toBeNull();

      const studentAccessToken = await getCurrentSessionAccessToken(page);
      const saveAnswerResult = await requestBackendJson<{
        data?: {
          evaluation_status?: string;
        };
      }>(page, `/api/v1/attempts/${studentAttemptId}/save-answer/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {
          question: questionId,
          answer_text: answerText,
        },
      });
      expect(saveAnswerResult.response.ok()).toBe(true);
      expect(saveAnswerResult.payload.data?.evaluation_status).toBe("manual_pending");

      const submitAttemptResult = await requestBackendJson(page, `/api/v1/attempts/${studentAttemptId}/submit/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {},
      });
      expect(submitAttemptResult.response.ok()).toBe(true);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto(`/institute/results?exam=${examId}`);
      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const reviewTaskId = await waitForReviewTaskInQueue(page, examId!);
      expect(reviewTaskId).not.toBeNull();

      const moderationResponse = await requestBackendJson(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: awardedMarks,
          review_notes: `Student descriptive analytics moderation ${uniqueSeed}`,
        },
      });
      expect(moderationResponse.response.ok()).toBe(true);

      const generateResultsResponse = await requestBackendJson(page, "/api/v1/results/generate-for-exam/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(generateResultsResponse.response.ok()).toBe(true);

      const calculateRanksResponse = await requestBackendJson(page, "/api/v1/results/calculate-ranks/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(calculateRanksResponse.response.ok()).toBe(true);

      const publishResultsResponse = await requestBackendJson(page, "/api/v1/results/publish-exam-results/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(publishResultsResponse.response.ok()).toBe(true);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome&result_status=review_ready");
            return resultCardByTitle(page, examTitle).isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      const studentResultCard = resultCardByTitle(page, examTitle);
      await expect(studentResultCard).toBeVisible();
      await expect(studentResultCard).toContainText(/result published/i);

      await studentResultCard.getByRole("link", { name: /open answer review/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/review(?:\\?.*)?$`));
      await expect(page.getByText(/80%/i).first()).toBeVisible();
      await expect(page.getByText(/8(\.00)? final score/i).first()).toBeVisible();

      const analyticsLink = page.getByRole("link", { name: /view analytics/i }).first();
      await expect(analyticsLink).toBeVisible();
      await analyticsLink.click();

      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
      await expect(page.getByText(/recent published results/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /compare results/i }).first()).toBeVisible();

      await page.getByRole("link", { name: /compare results/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /result comparison/i }).first()).toBeVisible();
      await expect(page.getByText(/80%/i).first()).toBeVisible();

      await page.goto(`/app/analytics/questions?subject=${encodeURIComponent(studentSubjectName!)}`);
      await expect(page.getByRole("heading", { name: /question analytics/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      const questionDetail = page.locator("details.analyticsQuestionSurface").filter({
        has: page.getByText(new RegExp(escapeRegExp(questionText), "i")),
      }).first();
      await expect(questionDetail).toBeVisible();
      await questionDetail.locator("summary").click();
      await expect(questionDetail.getByText(/attempt signal/i)).toBeVisible();
      await expect(questionDetail.getByText(/^8\.00$/i).first()).toBeVisible();

      const analyticsApiResponse = await requestBackendJson<{
        questions?: Array<{
          question_text?: string;
          your_marks_awarded?: string;
        }>;
      }>(page, `/api/v1/student/insights/question-analytics/?subject=${encodeURIComponent(studentSubjectName!)}`);
      expect(analyticsApiResponse.response.ok()).toBe(true);
      const analyticsQuestion =
        analyticsApiResponse.payload.questions?.find((item) =>
          item.question_text?.includes(questionText),
        ) ?? null;
      expect(analyticsQuestion).not.toBeNull();
      expect(analyticsQuestion?.your_marks_awarded).toBe("8.00");

      await page.goto("/app/analytics/timeline");
      await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        await deleteInstituteExam(page, examId);
      }
      if (questionId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
    }
  });
});
