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

function questionPatternRowByTitle(page: Page, title: string) {
  return page.locator(".studentQuestionPatternTable tbody tr").filter({
    has: page.locator("td strong", { hasText: title }),
  }).first();
}

function logStep(step: string, startedAt: number) {
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[student-descriptive-analytics] ${step} at +${elapsedSeconds}s`);
}

async function logExamDetailPrimaryActions(page: Page, startedAt: number) {
  const startButtons = await page
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons
        .map((button) => ({
          text: (button.textContent ?? "").trim(),
          disabled: (button as HTMLButtonElement).disabled,
        }))
        .filter((button) => /^(start|resume|save|submit|open)/i.test(button.text)),
    );
  const links = await page
    .getByRole("link")
    .evaluateAll((anchors) =>
      anchors
        .map((anchor) => ({
          text: (anchor.textContent ?? "").trim(),
          href: (anchor as HTMLAnchorElement).getAttribute("href") ?? "",
        }))
        .filter((anchor) => /start|resume|summary|review|attempt/i.test(anchor.text)),
    );
  logStep(`exam detail actions buttons=${JSON.stringify(startButtons)} links=${JSON.stringify(links)}`, startedAt);
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

async function fetchStudentResultsByExamTitle(
  page: Page,
  accessToken: string,
  examTitle: string,
) {
  const response = await requestBackendJsonWithAccessToken<
    Array<{
      id?: string;
      exam_title?: string;
      exam_code?: string;
      attempt?: string;
      is_published?: boolean;
      review_available?: boolean;
      result_status?: string | null;
      published_at?: string | null;
    }>
  >(page, accessToken, "/api/v1/student/results/");
  expect(response.response.ok(), response.bodyText).toBe(true);
  const results = response.payload ?? [];
  return results.filter((item) => item.exam_title?.trim() === examTitle);
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

async function waitForReviewTaskInQueue(
  page: Page,
  args: {
    examId: string;
    attemptId?: string | null;
    studentId?: string | null;
    questionText?: string | null;
    accessToken?: string | null;
  },
) {
  const instituteAccessToken = args.accessToken?.trim() || (await getCurrentSessionAccessToken(page));

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await page.request.get(`${backendBaseUrl}/api/v1/attempts/review-tasks/?exam=${args.examId}&page_size=100`, {
      headers: {
        Authorization: `Bearer ${instituteAccessToken}`,
      },
      timeout: 15000,
    });

    if (response.ok()) {
      const payload = (await response.json().catch(() => null)) as
        | {
            results?: Array<{
              id?: string;
              attempt_id?: string;
              exam_id?: string;
              student_id?: string;
              question_text?: string;
              question_text_summary?: string;
            }>;
          }
        | null;
      const tasks = payload?.results ?? [];
      const matchingTask = tasks.find((task) => {
        if (typeof task?.id !== "string" || task.id.trim().length === 0) {
          return false;
        }
        if (args.attemptId && task.attempt_id !== args.attemptId) {
          return false;
        }
        if (args.studentId && task.student_id !== args.studentId) {
          return false;
        }
        if (args.questionText) {
          const haystack = `${task.question_text ?? ""} ${task.question_text_summary ?? ""}`.toLowerCase();
          if (!haystack.includes(args.questionText.toLowerCase())) {
            return false;
          }
        }
        return true;
      }) ?? null;
      const candidatePreview = tasks.slice(0, 5).map((task) => ({
        id: task.id ?? "",
        attempt_id: task.attempt_id ?? "",
        student_id: task.student_id ?? "",
        question_text_summary: task.question_text_summary ?? "",
      }));
      console.log(
        `[student-descriptive-analytics] review task poll ${attempt + 1}/20 status=${response.status()} total=${tasks.length} matched=${matchingTask ? "yes" : "no"} targetAttempt=${args.attemptId ?? ""} preview=${JSON.stringify(candidatePreview)}`,
      );
      const taskId = matchingTask?.id ?? null;
      if (taskId) {
        return taskId;
      }
    } else {
      console.log(
        `[student-descriptive-analytics] review task poll ${attempt + 1}/20 status=${response.status()} body=${await response.text()}`,
      );
    }

    await page.waitForTimeout(1000);
  }

  return null;
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
    test.setTimeout(420000);
    const startedAt = Date.now();

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
      logStep("login student and load context", startedAt);
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
      studentSubjectName = pickStableStudentSubjectLabel(studentMe.payload?.student_context?.subject_options);
      expect(studentAcademicYearName).not.toBeNull();
      expect(studentProgramName).not.toBeNull();
      expect(studentSubjectName).not.toBeNull();

      logStep("login institute and create descriptive question", startedAt);
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

      logStep("create exam shell", startedAt);
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

      logStep("configure exam builder and attach question", startedAt);
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

      logStep("assign student and publish exam", startedAt);
      await assignStudentToExam(page, examId!, studentProfileId!);
      const instituteAccessToken = await getInstituteCleanupAccessToken(page);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("10");
      await page.locator('input[name="passing_marks"]').fill("4");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await publishAndMarkExamLiveWithAccessToken(page, instituteAccessToken, examId!);

      logStep("student attempt start and submit", startedAt);
      logStep("student relogin before attempt", startedAt);
      await loginAsRole(page, "student");
      logStep("student relogin complete", startedAt);
      await expectStudentWorkspace(page);
      logStep("student workspace visible before exam launch", startedAt);
      await page.goto(`/app/exams/${examId}`);
      logStep("student exam detail route opened", startedAt);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      logStep("student exam detail ready", startedAt);
      await logExamDetailPrimaryActions(page, startedAt);
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
        .click();
      logStep("student start clicked", startedAt);

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      logStep("attempt page loaded", startedAt);
      const attemptUrl = page.url().split("?")[0] ?? page.url();
      studentAttemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(studentAttemptId).not.toBeNull();

      const studentAccessToken = await getCurrentSessionAccessToken(page);
      logStep("student access token ready", startedAt);
      logStep("student save-answer request", startedAt);
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
      logStep("student answer saved", startedAt);

      logStep("student attempt submit request", startedAt);
      const submitAttemptResult = await requestBackendJson(page, `/api/v1/attempts/${studentAttemptId}/submit/`, {
        method: "POST",
        accessToken: studentAccessToken,
        data: {},
      });
      expect(submitAttemptResult.response.ok()).toBe(true);
      logStep("student attempt submitted", startedAt);

      logStep("institute review queue and moderation", startedAt);

      const markCompletedResponse = await requestBackendJsonWithAccessToken(
        page,
        instituteAccessToken,
        `/api/v1/exams/${examId}/mark-completed/`,
        {
          method: "POST",
          data: {
            remarks: `Student descriptive analytics completion gate ${uniqueSeed}`,
          },
        },
      );
      if (!markCompletedResponse.response.ok()) {
        expect(
          /already completed|invalid transition|not allowed/i.test(markCompletedResponse.bodyText),
          markCompletedResponse.bodyText,
        ).toBe(true);
      }
      const reviewTaskId = await waitForReviewTaskInQueue(page, {
        examId: examId!,
        attemptId: studentAttemptId,
        studentId: studentProfileId,
        questionText,
        accessToken: instituteAccessToken,
      });
      expect(reviewTaskId).not.toBeNull();

      const moderationResponse = await requestBackendJsonWithAccessToken(page, instituteAccessToken, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: awardedMarks,
          review_notes: `Student descriptive analytics moderation ${uniqueSeed}`,
        },
      });
      expect(moderationResponse.response.ok()).toBe(true);

      logStep("generate ranks and publish results", startedAt);
      const generateResultsResponse = await requestBackendJsonWithAccessToken(page, instituteAccessToken, "/api/v1/results/generate-for-exam/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(generateResultsResponse.response.ok()).toBe(true);

      const calculateRanksResponse = await requestBackendJsonWithAccessToken(page, instituteAccessToken, "/api/v1/results/calculate-ranks/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(calculateRanksResponse.response.ok()).toBe(true);

      const publishResultsResponse = await requestBackendJsonWithAccessToken(page, instituteAccessToken, "/api/v1/results/publish-exam-results/", {
        method: "POST",
        data: {
          exam: examId,
        },
      });
      expect(publishResultsResponse.response.ok()).toBe(true);

      logStep("student result polling", startedAt);
      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      const refreshedStudentAccessToken = await getCurrentSessionAccessToken(page);
      await expect
        .poll(
          async () => {
            const matchingResults = await fetchStudentResultsByExamTitle(
              page,
              refreshedStudentAccessToken,
              examTitle,
            );
            console.log(
              `[student-descriptive-analytics] student results api snapshot=${JSON.stringify(matchingResults)}`,
            );
            return matchingResults.some((result) => result.is_published);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome&result_status=pass");
            return resultRowByTitle(page, examTitle).isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      const studentResultRow = resultRowByTitle(page, examTitle);
      await expect(studentResultRow).toBeVisible();
      await expect(studentResultRow).toContainText(/pass/i);
      await expect(studentResultRow).toContainText(/available/i);

      logStep("analytics compare and question analytics checks", startedAt);
      await studentResultRow.click();
      const resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await expect(resultModal).toContainText(/result details/i);
      await resultModal.getByRole("link", { name: /open answer review/i }).click();
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
      await expect(page.getByRole("heading", { name: /question pattern report/i }).first()).toBeVisible();
      const questionPatternRow = questionPatternRowByTitle(page, questionText);
      await expect(questionPatternRow).toBeVisible();
      await questionPatternRow.click();
      const questionPatternModal = resultDetailsModal(page);
      await expect(questionPatternModal).toBeVisible();
      await expect(questionPatternModal).toContainText(new RegExp(escapeRegExp(questionText), "i"));
      await expect(questionPatternModal).toContainText(/what this means/i);
      await expect(questionPatternModal).toContainText(/this question is costing marks/i);

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

      logStep("timeline verification", startedAt);
      await page.goto("/app/analytics/timeline");
      await expect(page.getByRole("heading", { name: /momentum over time/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
      logStep("workflow assertions complete", startedAt);
    } finally {
      logStep("cleanup start", startedAt);
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
        const deleteQuestionResponse = await page.request.delete(`${backendBaseUrl}/api/v1/question-bank/questions/${questionId}/`, {
          headers: {
            Authorization: `Bearer ${instituteAccessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        if (!deleteQuestionResponse.ok()) {
          const deleteQuestionBody = await deleteQuestionResponse.text().catch(() => "");
          expect(
            deleteQuestionResponse.status() === 404 ||
              deleteQuestionResponse.status() === 409 ||
              /not found|cannot delete|in use|already removed/i.test(deleteQuestionBody),
            deleteQuestionBody,
          ).toBe(true);
        }
      }
      logStep("cleanup complete", startedAt);
    }
  });
});
