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

function pickStableStudentSubjectLabel(
  options: Array<{ label?: string }> | null | undefined,
) {
  const labels = (options ?? [])
    .map((item) => item.label?.trim() ?? "")
    .filter((label) => label.length > 0);

  const preferredStableLabel =
    labels.find((label) => !/^PW Sparse Subject\b/i.test(label)) ??
    null;

  return preferredStableLabel;
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function resultRowByTitle(page: Page, title: string) {
  return page.locator(".studentResultsTable tbody tr").filter({
    has: page.locator("td strong", { hasText: title }),
  }).first();
}

function resultDetailsModal(page: Page) {
  return page.locator(".studentResultsModalCard").first();
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

async function getInstituteCleanupAccessToken(page: Page) {
  const instituteCredentials = getRoleCredentials("institute");
  expect(instituteCredentials).not.toBeNull();

  const response = await page.request.post(`${backendBaseUrl}/api/v1/auth/login/`, {
    data: {
      username: instituteCredentials!.username,
      password: instituteCredentials!.password,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { access?: string | null };
  const accessToken = payload.access?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function requestBackendJsonWithAccessToken<T>(
  page: Page,
  accessToken: string,
  path: string,
  init?: {
    method?: "GET" | "POST";
    data?: Record<string, unknown>;
  },
) {
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

async function publishAndMarkExamLiveWithAccessToken(
  page: Page,
  accessToken: string,
  examId: string,
) {
  const publishResponse = await requestBackendJsonWithAccessToken<Record<string, unknown>>(
    page,
    accessToken,
    `/api/v1/exams/${examId}/publish/`,
    {
      method: "POST",
      data: {},
    },
  );
  expect(publishResponse.response.ok(), publishResponse.bodyText).toBe(true);

  const liveResponse = await requestBackendJsonWithAccessToken<Record<string, unknown>>(
    page,
    accessToken,
    `/api/v1/exams/${examId}/mark-live/`,
    {
      method: "POST",
      data: {},
    },
  );
  expect(liveResponse.response.ok(), liveResponse.bodyText).toBe(true);
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
  const accessToken = await getInstituteCleanupAccessToken(page);

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

test.describe("Student mutable descriptive result storytelling", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "student descriptive release storytelling coverage",
    ),
  );

  test("@workflow @mutable student can follow a descriptive manually reviewed result across results summary review and learner-visible scoring", async ({
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
    let studentAttemptId: string | null = null;
    const uniqueSeed = Date.now();
    const questionText = `PW student descriptive storytelling question ${uniqueSeed}`;
    const examTitle = `PW Student Descriptive Story ${uniqueSeed}`;
    const examCode = `PW-SDS-${uniqueSeed}`;
    const reviewNotes = `Student-facing descriptive moderation ${uniqueSeed}`;
    const answerText = `This is a descriptive learner answer ${uniqueSeed}.`;
    const awardedMarks = "8.00";
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
      studentSubjectName = pickStableStudentSubjectLabel(studentMe.payload?.student_context?.subject_options);
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
        .fill("Playwright descriptive explanation for student storytelling coverage.");
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

      const instituteAccessToken = await getInstituteCleanupAccessToken(page);
      await publishAndMarkExamLiveWithAccessToken(page, instituteAccessToken, examId!);

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

      await page.goto(`/app/attempts/${studentAttemptId}/summary`);
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/summary`));
      await expect(page.getByText(/evaluation pending/i).first()).toBeVisible();
      await expect(page.getByText(/review locked/i).first()).toBeVisible();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await page.goto(`/institute/results?exam=${examId}`);
      const markCompletedResponse = await requestBackendJsonWithAccessToken(
        page,
        instituteAccessToken,
        `/api/v1/exams/${examId}/mark-completed/`,
        {
          method: "POST",
          data: {
            remarks: `Student descriptive storytelling completion gate ${uniqueSeed}`,
          },
        },
      );
      if (!markCompletedResponse.response.ok()) {
        expect(
          /already completed|invalid transition|not allowed/i.test(markCompletedResponse.bodyText),
          markCompletedResponse.bodyText,
        ).toBe(true);
      }

      const reviewTaskId = await waitForReviewTaskInQueue(page, examId!);
      expect(reviewTaskId).not.toBeNull();

      await page.goto(`/institute/reviews?exam=${examId}&task=${reviewTaskId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();

      const moderationResponse = await requestBackendJson(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: awardedMarks,
          review_notes: reviewNotes,
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
            return resultRowByTitle(page, examTitle).isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      const studentResultRow = resultRowByTitle(page, examTitle);
      await expect(studentResultRow).toBeVisible();
      await expect(studentResultRow).toContainText(/pass/i);
      await expect(studentResultRow).toContainText(/available/i);

      await studentResultRow.click();
      const resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await expect(resultModal.getByRole("link", { name: /open summary/i })).toBeVisible();
      await expect(resultModal.getByRole("link", { name: /open answer review/i })).toBeVisible();

      await resultModal.getByRole("link", { name: /open summary/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${studentAttemptId}/summary(?:\\?.*)?$`));
      await expect(page.getByText(/attempt summary/i).first()).toBeVisible();
      await expect(page.getByText(/attempt status/i).first()).toBeVisible();
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
      await expect(page.getByText(/80%/i).first()).toBeVisible();
      await expect(page.getByText(/8(\.00)? final score/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(questionText), "i")).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(answerText), "i")).first()).toBeVisible();

      await page.getByRole("link", { name: /view analytics/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
      await expect(page.getByText(/recent published results/i).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
    } finally {
      const instituteAccessToken = examId || questionId
        ? await getInstituteCleanupAccessToken(page)
        : null;
      if (examId && instituteAccessToken) {
        const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
          headers: {
            Authorization: `Bearer ${instituteAccessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        expect(response.ok(), await response.text()).toBe(true);
      }
      if (questionId && instituteAccessToken) {
        const deleteQuestionResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`, {
          headers: {
            Authorization: `Bearer ${instituteAccessToken}`,
          },
          timeout: 15000,
        });
        if (!deleteQuestionResponse.ok()) {
          const deleteQuestionBody = await deleteQuestionResponse.text();
          expect(
            /not found|does not exist|protected|constraint|in use|portal session is not available/i.test(deleteQuestionBody),
            deleteQuestionBody,
          ).toBe(true);
        }
      }
    }
  });
});
