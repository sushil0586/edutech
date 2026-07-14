import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { assignStudentToExam } from "../helpers/family-runtime";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
} from "../helpers/navigation";

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

function instituteResultsWorkspaceReadinessCard(page: Page, title: RegExp) {
  return page.locator(".teacherResultsReadinessCard").filter({
    has: page.getByText(title),
  }).first();
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
        | { count?: number; results?: Array<{ id?: string }> }
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

test.describe("Institute mutable descriptive results actions", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "disposable institute descriptive review publication coverage",
    ),
  );

  test("@workflow @mutable institute can review descriptive answers and publish disposable results", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentSubjectName: string | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW institute descriptive review question ${uniqueSeed}`;
    const examTitle = `PW Institute Descriptive Results ${uniqueSeed}`;
    const examCode = `PW-IDR-${uniqueSeed}`;
    const reviewNotes = `Institute reviewed by Playwright ${uniqueSeed}`;
    const answerText = `This is a disposable institute descriptive answer ${uniqueSeed}.`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
      const identityCard = page.locator(".detailCard").filter({
        has: page.getByText(/^name$/i),
      }).first();
      if (await identityCard.count()) {
        const renderedName = (await identityCard.locator("strong").first().textContent())?.trim();
        if (renderedName) {
          studentDisplayName = renderedName;
        }
      }
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
        .fill("Playwright disposable explanation for institute descriptive review coverage.");
      await page
        .locator('textarea[name="review_guidance"]')
        .fill("Award strong marks when the learner explains the idea clearly with one concrete example.");
      await page.locator('input[name="default_marks"]').fill("10");
      await page.locator('input[name="negative_marks"]').fill("0");

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.locator('textarea[name="question_text"]')).toHaveValue(questionText);

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
      const studentAttemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
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

      const submitAttemptResult = await requestBackendJson<{
        success?: boolean;
      }>(page, `/api/v1/attempts/${studentAttemptId}/submit/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {},
      });
      expect(submitAttemptResult.response.ok()).toBe(true);
      await page.goto(`/app/attempts/${studentAttemptId}/summary`);
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/summary`));

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/0 generated/i);

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const reviewTaskId = await waitForReviewTaskInQueue(page, examId!);
      expect(reviewTaskId).not.toBeNull();

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      await expect(page.getByText(/assignment detail/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();
      const moderateTaskButton = page.getByRole("button", { name: /moderate task/i }).first();
      await expect(moderateTaskButton).toBeVisible();
      const moderationResponse = await requestBackendJson<{
        data?: {
          status?: string;
          latest_marks_awarded?: string;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: "8.00",
          review_notes: reviewNotes,
        },
      });
      expect(moderationResponse.response.ok()).toBe(true);

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(
        page.locator(".statusPill").filter({ hasText: /^moderated$/i }).first(),
      ).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(reviewNotes), "i")).first()).toBeVisible();
      await expect(page.getByText(/marks:\s*8/i).first()).toBeVisible();

      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
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

      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/ready/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 generated/i);
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/1 published/i);

      await page.getByRole("link", { name: /open leaderboard/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*exam=/);
      await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(/rank 1/i).first()).toBeVisible();

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome");
            return resultCardByTitle(page, examTitle).isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);
      const studentResultCard = resultCardByTitle(page, examTitle);
      await expect(studentResultCard).toContainText(/result published/i);
      await expect(studentResultCard.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();
      await expect(studentResultCard.getByRole("link", { name: /open summary/i }).first()).toBeVisible();

      await studentResultCard.getByRole("link", { name: /open summary/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/summary(?:\\?.*)?$`));
      await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
      await expect(page.getByText(/result published/i).first()).toBeVisible();
      await expect(page.getByText(/review available/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open answer review|review feedback/i }).first()).toBeVisible();

      await page.getByRole("link", { name: /open answer review|review feedback/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/review(?:\\?.*)?$`));
      await expect(
        page.getByRole("heading", {
          name: new RegExp(`${escapeRegExp(examTitle)}\\s+Review`, "i"),
        }).first(),
      ).toBeVisible();
      await expect(page.getByText(/review mode/i).first()).toBeVisible();
      await expect(page.getByText(/review available/i).first()).toBeVisible();
      await expect(page.locator(".contentCard").filter({ hasText: /review state/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();
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
