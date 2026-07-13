import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { assignStudentToExam, backendBaseUrl, scheduleAndPublishExam } from "../helpers/family-runtime";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableInstituteReviewActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);

type SessionProfile = {
  student_profile?: string | null;
  teacher_profile?: string | null;
  student_context?: {
    academic_year_name?: string;
    program_name?: string;
    subject_options?: Array<{ label?: string }>;
  } | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    method?: "GET" | "POST" | "DELETE";
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
  const accessToken = await getCurrentSessionAccessToken(page);

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const response = await page.request.get(`${backendBaseUrl}/api/v1/attempts/review-tasks/?exam=${examId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok()) {
      const payload = (await response.json().catch(() => null)) as
        | { results?: Array<{ id?: string }> }
        | null;
      const taskId =
        payload?.results?.find((task) => typeof task?.id === "string" && task.id.trim().length > 0)?.id ??
        null;
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

async function deleteInstituteExam(page: Page, examId: string, accessTokenOverride?: string) {
  const accessToken = accessTokenOverride ?? (await getCurrentSessionAccessToken(page));

  try {
    const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
    if (response.ok()) return;
  } catch {
    return;
  }
}

async function deleteInstituteQuestion(page: Page, questionId: string, accessTokenOverride?: string) {
  const accessToken = accessTokenOverride ?? (await getCurrentSessionAccessToken(page));

  try {
    const response = await page.request.delete(`${backendBaseUrl}/api/v1/question-bank/questions/${questionId}/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
    if (response.ok()) return;
  } catch {
    return;
  }
}

test.describe("Institute mutable reviews lifecycle", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student") || testRequiresRole("teacher"),
    "Institute, student, and teacher Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteReviewActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "institute review assignment and moderation coverage",
    ),
  );

  test("@workflow @mutable institute can assign, recheck, and moderate a disposable review task through the browser", async ({
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
    let assignedReviewerId = "";
    let instituteAccessToken = "";
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW institute review queue question ${uniqueSeed}`;
    const examTitle = `PW Institute Review Queue ${uniqueSeed}`;
    const examCode = `PW-IRQ-${uniqueSeed}`;
    const teacherReviewNotes = `Teacher first-pass review ${uniqueSeed}`;
    const recheckNotes = `Institute browser recheck ${uniqueSeed}`;
    const secondTeacherReviewNotes = `Teacher second-pass review ${uniqueSeed}`;
    const moderationNotes = `Institute browser moderation ${uniqueSeed}`;
    const answerText = `Disposable institute review workflow answer ${uniqueSeed}.`;

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
      const studentMe = await requestBackendJson<SessionProfile>(page, "/api/v1/auth/me/");
      studentProfileId = studentMe.payload?.student_profile?.trim() ?? null;
      studentAcademicYearName = studentMe.payload?.student_context?.academic_year_name?.trim() ?? null;
      studentProgramName = studentMe.payload?.student_context?.program_name?.trim() ?? null;
      studentSubjectName =
        studentMe.payload?.student_context?.subject_options?.find((item) => item.label?.trim())?.label?.trim() ??
        null;
      expect(studentProfileId).not.toBeNull();
      expect(studentAcademicYearName).not.toBeNull();
      expect(studentProgramName).not.toBeNull();
      expect(studentSubjectName).not.toBeNull();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      instituteAccessToken = await getCurrentSessionAccessToken(page);

      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
      await selectOptionByLabel(page.locator('select[name="program"]'), studentProgramName!);
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await waitForSelectableOption(page.locator('select[name="subject"]'));
      await selectOptionByLabel(page.locator('select[name="subject"]'), studentSubjectName!);
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      const topicHasSelectableOptions = await page
        .locator('select[name="topic"] option')
        .evaluateAll((options) =>
          options.some((option) => (option as HTMLOptionElement).value.trim().length > 0),
        );
      if (topicHasSelectableOptions) {
        await selectFirstNonEmptyOption(page.locator('select[name="topic"]'));
      }
      await page.locator('select[name="question_type"]').selectOption("essay_manual_review");
      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright explanation for institute review queue lifecycle coverage.");
      await page
        .locator('textarea[name="review_guidance"]')
        .fill("Award higher marks for correctness, structure, and one concrete example.");
      await page.locator('input[name="default_marks"]').fill("10");
      await page.locator('input[name="negative_marks"]').fill("0");
      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      questionId = (page.url().split("?")[0] ?? page.url()).match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
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
      examId = (page.url().split("?")[0] ?? page.url()).match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/institute/exams/${examId}/builder`);
      await selectOptionByLabel(page.locator('select[name="academic_year"]'), studentAcademicYearName!);
      await selectOptionStartingWithLabel(page.locator('select[name="program"]'), studentProgramName!);
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
      await scheduleAndPublishExam(page, examId!);

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      const studentAccessToken = await getCurrentSessionAccessToken(page);
      const startAttemptResult = await requestBackendJson<{
        data?: { id?: string };
      }>(page, "/api/v1/attempts/start/", {
        method: "POST",
        accessToken: studentAccessToken,
        data: {
          exam: examId,
          student: studentProfileId,
        },
      });
      expect(startAttemptResult.response.ok(), startAttemptResult.bodyText).toBe(true);
      const studentAttemptId = startAttemptResult.payload?.data?.id?.trim() ?? null;
      expect(studentAttemptId).not.toBeNull();
      const saveAnswerResult = await requestBackendJson<{
        data?: { evaluation_status?: string };
      }>(page, `/api/v1/attempts/${studentAttemptId}/save-answer/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {
          question: questionId,
          answer_text: answerText,
        },
      });
      expect(saveAnswerResult.response.ok()).toBe(true);
      expect(saveAnswerResult.payload?.data?.evaluation_status).toBe("manual_pending");
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

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      await expect(page.getByText(/assignment detail/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();

      assignedReviewerId = await selectFirstNonEmptyOption(
        page.locator('form.analyticsResultReviewForm select[name="assigned_to_teacher"]').first(),
      );
      await page.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/message=Reviewer(\+|%20)assigned(\+|%20)successfully\./);
      await expect
        .poll(async () => {
          const taskDetail = await requestBackendJson<{
            id?: string;
            assigned_to_teacher?: string | null;
          }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/`);
          return taskDetail.payload?.assigned_to_teacher?.trim() ?? "";
        })
        .toBe(assignedReviewerId);
      await expect(page.getByText(/assigned:/i).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      const firstTeacherReview = await requestBackendJson(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/submit-review/`, {
        method: "POST",
        data: {
          marks_awarded: "6.00",
          review_notes: teacherReviewNotes,
        },
      });
      expect(firstTeacherReview.response.ok()).toBe(true);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(teacherReviewNotes), "i")).first()).toBeVisible();

      await page.locator('form.analyticsResultReviewForm textarea[name="review_notes"]').nth(0).fill(recheckNotes);
      await page.getByRole("button", { name: /request recheck/i }).click();
      await expect(page).toHaveURL(/message=Task(\+|%20)returned(\+|%20)for(\+|%20)recheck\./);
      await expect(page.locator(".statusPill").filter({ hasText: /recheck requested/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(recheckNotes), "i")).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      const secondTeacherReview = await requestBackendJson(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/submit-review/`, {
        method: "POST",
        data: {
          marks_awarded: "8.00",
          review_notes: secondTeacherReviewNotes,
        },
      });
      expect(secondTeacherReview.response.ok()).toBe(true);

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondTeacherReviewNotes), "i")).first()).toBeVisible();

      await page.locator('input[name="marks_awarded"]').fill("9");
      await page.locator('form.analyticsResultReviewForm textarea[name="review_notes"]').nth(1).fill(moderationNotes);
      await page.getByRole("button", { name: /moderate task/i }).click();
      await expect(page).toHaveURL(/message=Task(\+|%20)moderated(\+|%20)successfully\./);
      await expect(page.locator(".statusPill").filter({ hasText: /^moderated$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(moderationNotes), "i")).first()).toBeVisible();
      await expect(page.getByText(/marks:\s*9/i).first()).toBeVisible();
      await expect(page.getByText(/recheck requested/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await deleteInstituteExam(page, examId, instituteAccessToken || undefined);
      }
      if (questionId) {
        await deleteInstituteQuestion(page, questionId, instituteAccessToken || undefined);
      }
    }
  });
});
