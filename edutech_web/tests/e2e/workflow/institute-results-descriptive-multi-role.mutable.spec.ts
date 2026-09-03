import { expect, test, type Locator, type Page } from "@playwright/test";
import { assignStudentToExam } from "../helpers/family-runtime";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectInstituteWorkspace,
  expectStudentWorkspace,
  expectTeacherWorkspace,
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

type SessionProfile = {
  institute?: string | null;
  teacher_profile?: string | null;
};

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

function resultRowByTitle(page: Page, title: string) {
  return page.getByRole("button", { name: new RegExp(escapeRegExp(title), "i") }).first();
}

async function getNonEmptyOptions(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        label: (option as HTMLOptionElement).label,
        value: (option as HTMLOptionElement).value,
      }))
      .filter((option) => option.value.trim().length > 0),
  );
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

async function selectSubjectWithTopicOptions(
  page: Page,
  subjectLocator: Locator,
  topicLocator: Locator,
  preferredSubjectLabel: string | null,
) {
  await waitForSelectableOption(subjectLocator);
  const subjects = await getNonEmptyOptions(subjectLocator);
  const preferredSubject =
    (preferredSubjectLabel
      ? subjects.find((subject) => subject.label.trim().toLowerCase() === preferredSubjectLabel.trim().toLowerCase())?.value
      : null) ??
    subjects.find((subject) => /math/i.test(subject.label))?.value ??
    subjects[0]?.value ??
    null;
  expect(preferredSubject).not.toBeNull();

  const candidateSubjects = [
    preferredSubject!,
    ...subjects.map((subject) => subject.value).filter((value) => value !== preferredSubject),
  ];

  for (const subjectValue of candidateSubjects) {
    const topicsResponse = page
      .waitForResponse((response) => {
        if (!response.ok()) {
          return false;
        }
        const url = new URL(response.url());
        return url.pathname.includes("/academics/topics") && url.searchParams.get("subject") === subjectValue;
      }, { timeout: 5000 })
      .catch(() => null);
    await subjectLocator.selectOption(subjectValue);
    await expect.poll(async () => subjectLocator.inputValue()).toBe(subjectValue);
    await topicsResponse;
    await expect(topicLocator).toBeEnabled();

    const topics = await getNonEmptyOptions(topicLocator);
    if (topics.length > 0) {
      await topicLocator.selectOption(topics[0]!.value);
      await expect.poll(async () => topicLocator.inputValue()).toBe(topics[0]!.value);
      return { subjectValue, topicValue: topics[0]!.value };
    }
  }

  throw new Error("Expected at least one selected subject to hydrate topic options.");
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

async function runInstituteExamAction(
  page: Page,
  examId: string,
  action: "sync-marks" | "publish" | "mark-live" | "mark-completed" | "refresh-status",
) {
  const result = await requestBackendJson(page, `/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    data: {},
  });
  expect(result.response.ok(), result.bodyText).toBe(true);
}

async function fetchExamStatus(page: Page, examId: string) {
  const result = await requestBackendJson<{
    status?: string | null;
  }>(page, `/api/v1/exams/${examId}/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.status ?? null;
}

async function fetchResultPublishReadiness(page: Page, examId: string) {
  const result = await requestBackendJson<{
    data?: {
      ready?: boolean;
      generated_results_count?: number;
      published_results_count?: number;
    };
    ready?: boolean;
    generated_results_count?: number;
    published_results_count?: number;
  }>(page, `/api/v1/results/exam/${examId}/publish-readiness/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.data ?? result.payload;
}

async function fetchSessionProfile(page: Page, accessToken?: string) {
  const token = accessToken ?? (await getCurrentSessionAccessToken(page));
  const response = await page.request.get(`${backendBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as SessionProfile;
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

test.describe("Institute mutable descriptive multi-role moderation actions", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student") || testRequiresRole("teacher"),
    "Institute, student, and teacher Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "multi-role descriptive review moderation coverage",
    ),
  );

  test("@workflow @mutable institute and teacher can recheck, moderate, and publish a descriptive result", async ({
    page,
  }) => {
    test.setTimeout(300000);

    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentSubjectName: string | null = null;
    let questionId: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW institute multi-role review question ${uniqueSeed}`;
    const examTitle = `PW Institute Multi Role Results ${uniqueSeed}`;
    const examCode = `PW-IMR-${uniqueSeed}`;
    const teacherReviewNotes = `Teacher first-pass review ${uniqueSeed}`;
    const recheckNotes = `Institute recheck requested ${uniqueSeed}`;
    const secondTeacherReviewNotes = `Teacher second-pass review ${uniqueSeed}`;
    const moderationNotes = `Institute moderation approved ${uniqueSeed}`;
    const answerText = `This is a disposable multi-role descriptive answer ${uniqueSeed}.`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);

    try {
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: /^profile$/i }).first()).toBeVisible();
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

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      const teacherProfile = await fetchSessionProfile(page);
      const teacherProfileId = teacherProfile.teacher_profile?.trim() ?? "";
      expect(teacherProfileId).not.toBe("");

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
      await selectSubjectWithTopicOptions(page, subjectSelect, topicSelect, studentSubjectName);
      await questionTypeSelect.selectOption("essay_manual_review");

      await page.locator('textarea[name="question_text"]').fill(questionText);
      await page
        .locator('textarea[name="explanation"]')
        .fill("Playwright explanation for institute multi-role moderation coverage.");
      await page
        .locator('textarea[name="review_guidance"]')
        .fill("Award higher marks for clear explanation, one concrete example, and stronger structure.");
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
      if (await syncMarksButton.isVisible().catch(() => false)) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId!, "sync-marks");
      }
      const publishButton = page.getByRole("button", { name: /publish exam/i });
      if (await publishButton.isVisible().catch(() => false)) {
        await publishButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId!, "publish");
      }
      const markLiveButton = page.getByRole("button", { name: /mark live/i });
      if (await markLiveButton.isVisible().catch(() => false)) {
        await markLiveButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId!, "mark-live");
      }
      await expect
        .poll(async () => await fetchExamStatus(page, examId!), {
          timeout: 15000,
          message: `Expected exam ${examId} to be live before student attempt.`,
        })
        .toBe("live");

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

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(
        instituteResultsWorkspaceReadinessCard(page, /^result publish readiness$/i),
      ).toContainText(/blocked/i);

      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.isVisible().catch(() => false)) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      } else {
        await runInstituteExamAction(page, examId!, "refresh-status");
        await runInstituteExamAction(page, examId!, "mark-completed");
      }
      await expect
        .poll(async () => await fetchExamStatus(page, examId!), {
          timeout: 15000,
          message: `Expected exam ${examId} to complete before review/result publication.`,
        })
        .toBe("completed");

      const reviewTaskId = await waitForReviewTaskInQueue(page, examId!);
      expect(reviewTaskId).not.toBeNull();

      const assignResponse = await requestBackendJson<{
        data?: {
          status?: string;
          assigned_to_teacher?: string | null;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/assign/`, {
        method: "POST",
        data: {
          assigned_to_teacher: teacherProfileId,
        },
      });
      expect(assignResponse.response.ok()).toBe(true);

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();
      await expect(page.getByText(/assigned:/i).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      await expect(page.getByText(/task detail/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();

      const firstTeacherReview = await requestBackendJson<{
        data?: {
          status?: string;
          latest_marks_awarded?: string;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/submit-review/`, {
        method: "POST",
        data: {
          marks_awarded: "6.00",
          review_notes: teacherReviewNotes,
        },
      });
      expect(firstTeacherReview.response.ok()).toBe(true);

      await page.goto(`/teacher/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(teacherReviewNotes), "i")).first()).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();

      const requestRecheckResponse = await requestBackendJson<{
        data?: {
          status?: string;
          latest_review_summary?: string;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/request-recheck/`, {
        method: "POST",
        data: {
          review_notes: recheckNotes,
        },
      });
      expect(requestRecheckResponse.response.ok()).toBe(true);

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /recheck requested/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(recheckNotes), "i")).first()).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /recheck requested/i }).first()).toBeVisible();

      const secondTeacherReview = await requestBackendJson<{
        data?: {
          status?: string;
          latest_marks_awarded?: string;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/submit-review/`, {
        method: "POST",
        data: {
          marks_awarded: "8.00",
          review_notes: secondTeacherReviewNotes,
        },
      });
      expect(secondTeacherReview.response.ok()).toBe(true);

      await page.goto(`/teacher/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(secondTeacherReviewNotes), "i")).first()).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);
      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^reviewed$/i }).first()).toBeVisible();

      const moderateResponse = await requestBackendJson<{
        data?: {
          status?: string;
          latest_marks_awarded?: string;
        };
      }>(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: "9.00",
          review_notes: moderationNotes,
        },
      });
      expect(moderateResponse.response.ok()).toBe(true);

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.locator(".statusPill").filter({ hasText: /^moderated$/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(moderationNotes), "i")).first()).toBeVisible();
      await expect(page.getByText(/marks:\s*9/i).first()).toBeVisible();
      await expect(page.getByText(/recheck requested/i).first()).toBeVisible();

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

      await expect
        .poll(async () => Boolean((await fetchResultPublishReadiness(page, examId!))?.ready), {
          timeout: 60000,
          message: `Expected result publish readiness for exam ${examId} to be ready after publication.`,
        })
        .toBe(true);

      await page.goto(`/institute/results?exam=${examId}&qa_refresh=${Date.now()}`);
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

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome");
            return resultRowByTitle(page, examTitle).isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);
      const studentResultRow = resultRowByTitle(page, examTitle);
      await expect(studentResultRow).toBeVisible();
      await expect(page.getByText(/result published · pass|result published · fail/i).first()).toBeVisible();
      await studentResultRow.click();

      const studentResultDialog = page.getByRole("dialog");
      await expect(studentResultDialog).toBeVisible();
      await expect(studentResultDialog.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
      await expect(studentResultDialog.getByText(/published/i).first()).toBeVisible();
      await expect(studentResultDialog.getByRole("link", { name: /open answer review/i }).first()).toBeVisible();
      await expect(studentResultDialog.getByRole("link", { name: /open summary/i }).first()).toBeVisible();

      await studentResultDialog.getByRole("link", { name: /open summary/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/summary(?:\\?.*)?$`));
      await expect(page.getByText(/attempt summary/i).first()).toBeVisible();
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
