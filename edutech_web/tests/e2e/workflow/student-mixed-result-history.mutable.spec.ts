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

function resultRowByTitle(page: Page, title: string) {
  return page.locator(".studentResultsTable tbody tr").filter({
    has: page.locator("td strong", { hasText: title }),
  }).first();
}

function resultDetailsModal(page: Page) {
  return page.locator(".studentResultsModalCard").first();
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
  const method = init?.method ?? "GET";
  const url =
    method === "GET"
      ? `${backendBaseUrl}${path}${path.includes("?") ? "&" : "?"}__pw=${Date.now()}`
      : `${backendBaseUrl}${path}`;

  const response = await page.request.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
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

async function publishAndMarkExamLive(page: Page, examId: string) {
  const publishResponse = await requestBackendJson<Record<string, unknown>>(page, `/api/v1/exams/${examId}/publish/`, {
    method: "POST",
    data: {},
  });
  expect(publishResponse.response.ok(), publishResponse.bodyText).toBe(true);

  const liveResponse = await requestBackendJson<Record<string, unknown>>(page, `/api/v1/exams/${examId}/mark-live/`, {
    method: "POST",
    data: {},
  });
  expect(liveResponse.response.ok(), liveResponse.bodyText).toBe(true);
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
    await page.waitForTimeout(1500);
  }

  return null;
}

async function ensureToggleChecked(locator: Locator) {
  if (await locator.isChecked().catch(() => false)) {
    return;
  }

  await locator.click({ force: true }).catch(() => null);
  if (await locator.isChecked().catch(() => false)) {
    return;
  }

  const optionRow = locator.locator("xpath=ancestor::label[1]").first();
  if (await optionRow.count()) {
    await optionRow.click({ force: true });
    if (await locator.isChecked().catch(() => false)) {
      return;
    }
  }

  await locator.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function createQuestion(
  page: Page,
  args: {
    programName: string;
    subjectName: string;
    questionType: "true_false" | "essay_manual_review";
    questionText: string;
  },
) {
  await page.goto("/institute/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');

  await selectOptionStartingWithLabel(programSelect, args.programName);
  await waitForSelectableOption(subjectSelect);
  await selectOptionStartingWithLabel(subjectSelect, args.subjectName);
  await waitForSelectableOption(topicSelect);
  await selectFirstNonEmptyOption(topicSelect);

  await page.locator('select[name="question_type"]').selectOption(args.questionType);
  await page.locator('textarea[name="question_text"]').fill(args.questionText);
  await page.locator('textarea[name="explanation"]').fill(
    "Disposable mixed-state result history coverage.",
  );

  if (args.questionType === "essay_manual_review") {
    await page
      .locator('textarea[name="review_guidance"]')
      .fill("Award marks when the learner explains the idea clearly and directly.");
    await page.locator('input[name="default_marks"]').fill("10");
    await page.locator('input[name="negative_marks"]').fill("0");
  } else {
    const optionRows = page.locator(".questionEditorOptionRow");
    await expect(optionRows).toHaveCount(2);
    await optionRows.nth(1).locator('input[type="radio"]').check();
    await page.locator('input[name="default_marks"]').fill("1");
    await page.locator('input[name="negative_marks"]').fill("0");
  }

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
  const detailUrl = page.url().split("?")[0] ?? page.url();
  const questionId = detailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
  expect(questionId).not.toBeNull();
  return questionId!;
}

async function createExamShell(
  page: Page,
  args: {
    examTitle: string;
    examCode: string;
    academicYearName: string;
    programName: string;
  },
) {
  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await page.getByRole("textbox", { name: /exam title/i }).fill(args.examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(args.examCode);

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await page.getByRole("button", { name: /create exam shell/i }).click();
  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);

  const examDetailUrl = page.url().split("?")[0] ?? page.url();
  const examId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  await page.goto(`/institute/exams/${examId}/builder`);
  await selectOptionByLabel(page.locator('select[name="academic_year"]'), args.academicYearName);
  await selectOptionStartingWithLabel(page.locator('select[name="program"]'), args.programName);
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(new RegExp(`/institute/exams/${examId}/builder(?:\\?.*)?$`));

  return examId!;
}

async function attachQuestionToExam(
  page: Page,
  args: {
    examId: string;
    questionText: string;
    marks: string;
  },
) {
  await page.goto(`/institute/exams/${args.examId}/builder?tab=questions`);
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
    args.questionText,
  );
  expect(targetQuestionOption).not.toBeNull();
  await questionSelect.selectOption(targetQuestionOption!.value);
  await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
  await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill(args.marks);
  await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
  await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
  await expect(page).toHaveURL(/tab=questions&message=/);
}

async function configureExamAndPublish(
  page: Page,
  args: {
    examId: string;
    totalMarks: string;
    passingMarks: string;
    startAt: Date;
    endAt: Date;
    patch: Record<string, unknown>;
  },
) {
  const patchResponse = await requestBackendJson(page, `/api/v1/exams/${args.examId}/`, {
    method: "PATCH",
    data: {
      start_at: args.startAt.toISOString(),
      end_at: args.endAt.toISOString(),
      total_marks: args.totalMarks,
      passing_marks: args.passingMarks,
      ...args.patch,
    },
  });
  expect(patchResponse.response.ok(), patchResponse.bodyText).toBe(true);
  const patchedExam = (patchResponse.payload ?? {}) as Record<string, unknown>;
  if ("result_publish_mode" in args.patch) {
    expect(String(patchedExam.result_publish_mode ?? "")).toBe(String(args.patch.result_publish_mode));
  }
  if ("review_mode" in args.patch) {
    expect(String(patchedExam.review_mode ?? "")).toBe(String(args.patch.review_mode));
  }
  if ("allow_review_after_submit" in args.patch) {
    expect(Boolean(patchedExam.allow_review_after_submit)).toBe(Boolean(args.patch.allow_review_after_submit));
  }
  if ("show_result_immediately" in args.patch) {
    expect(Boolean(patchedExam.show_result_immediately)).toBe(Boolean(args.patch.show_result_immediately));
  }
  await expectExamDeliveryContract(page, args.examId, {
    resultPublishMode:
      typeof args.patch.result_publish_mode === "string" ? args.patch.result_publish_mode : undefined,
    reviewMode: typeof args.patch.review_mode === "string" ? args.patch.review_mode : undefined,
    allowReviewAfterSubmit:
      typeof args.patch.allow_review_after_submit === "boolean" ? args.patch.allow_review_after_submit : undefined,
    showResultImmediately:
      typeof args.patch.show_result_immediately === "boolean" ? args.patch.show_result_immediately : undefined,
  });

  await publishAndMarkExamLive(page, args.examId);
}

async function expectExamDeliveryContract(
  page: Page,
  examId: string,
  args: {
    resultPublishMode?: string;
    reviewMode?: string;
    allowReviewAfterSubmit?: boolean;
    showResultImmediately?: boolean;
  },
) {
  await expect
    .poll(
      async () => {
        const response = await requestBackendJson<Record<string, unknown>>(page, `/api/v1/exams/${examId}/`);
        expect(response.response.ok(), response.bodyText).toBe(true);
        const exam = (response.payload ?? {}) as Record<string, unknown>;
        return {
          result_publish_mode: String(exam.result_publish_mode ?? ""),
          review_mode: String(exam.review_mode ?? ""),
          allow_review_after_submit: Boolean(exam.allow_review_after_submit),
          show_result_immediately: Boolean(exam.show_result_immediately),
        };
      },
      {
        message: "Expected exam delivery contract to persist on follow-up read.",
      },
    )
    .toEqual({
      result_publish_mode: args.resultPublishMode ?? expect.any(String),
      review_mode: args.reviewMode ?? expect.any(String),
      allow_review_after_submit: args.allowReviewAfterSubmit ?? expect.any(Boolean),
      show_result_immediately: args.showResultImmediately ?? expect.any(Boolean),
    });
}

async function startAttempt(page: Page, examId: string, examTitle: string) {
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
  await page
    .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
    .click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  const attemptUrl = page.url().split("?")[0] ?? page.url();
  const attemptId = attemptUrl.match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
  expect(attemptId).not.toBeNull();
  return attemptId!;
}

async function chooseCurrentQuestionOption(page: Page, optionIndex: number) {
  const options = page.locator('input[name="selected_option"][type="radio"]:visible');
  await expect(options).toHaveCount(2);
  await ensureToggleChecked(options.nth(optionIndex));
  await expect(options.nth(optionIndex)).toBeChecked();
}

async function answerObjectiveAndSubmit(page: Page, optionIndex: number) {
  await chooseCurrentQuestionOption(page, optionIndex);
  await page.getByRole("button", { name: /^save answer$/i }).click();
  await expect(page.getByRole("button", { name: /^submit test$/i })).toBeEnabled();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
}

async function answerDescriptiveViaApi(
  page: Page,
  args: {
    attemptId: string;
    questionId: string;
    answerText: string;
  },
) {
  const studentAccessToken = await getCurrentSessionAccessToken(page);
  const saveAnswerResult = await requestBackendJson<{
    data?: {
      evaluation_status?: string;
    };
  }>(page, `/api/v1/attempts/${args.attemptId}/save-answer/`, {
    method: "POST",
    accessToken: studentAccessToken,
    data: {
      question: args.questionId,
      answer_text: args.answerText,
    },
  });
  expect(saveAnswerResult.response.ok(), saveAnswerResult.bodyText).toBe(true);
  expect(saveAnswerResult.payload?.data?.evaluation_status).toBe("manual_pending");

  const submitAttemptResult = await requestBackendJson(page, `/api/v1/attempts/${args.attemptId}/submit/`, {
    method: "POST",
    accessToken: studentAccessToken,
    data: {},
  });
  expect(submitAttemptResult.response.ok(), submitAttemptResult.bodyText).toBe(true);
}

async function markExamCompleted(page: Page, examId: string) {
  const response = await requestBackendJson(page, `/api/v1/exams/${examId}/mark-completed/`, {
    method: "POST",
    data: {
      remarks: "Playwright mixed-state completion gate",
    },
  });
  expect(response.response.ok(), response.bodyText).toBe(true);
}

async function publishExamResults(page: Page, examId: string) {
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

test.describe("Student mixed result history continuity", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "student mixed result history coverage",
    ),
  );

  test("@workflow @mutable one learner can navigate pending summary-only review-ready and descriptive-reviewed results coherently", async ({
    page,
  }) => {
    test.setTimeout(420000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentSubjectName: string | null = null;
    const cleanupExamIds: string[] = [];
    const uniqueSeed = Date.now();
    const objectiveQuestionText = `PW mixed history objective question ${uniqueSeed}`;
    const descriptiveQuestionText = `PW mixed history descriptive question ${uniqueSeed}`;
    const pendingExamTitle = `PW Mixed Pending ${uniqueSeed}`;
    const summaryOnlyExamTitle = `PW Mixed Summary Only ${uniqueSeed}`;
    const reviewReadyExamTitle = `PW Mixed Review Ready ${uniqueSeed}`;
    const descriptiveExamTitle = `PW Mixed Descriptive ${uniqueSeed}`;
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
      studentAcademicYearName = studentMe.payload?.student_context?.academic_year_name?.trim() ?? null;
      studentProgramName = studentMe.payload?.student_context?.program_name?.trim() ?? null;
      studentSubjectName = pickStableStudentSubjectLabel(studentMe.payload?.student_context?.subject_options);
      expect(studentProfileId).not.toBeNull();
      expect(studentAcademicYearName).not.toBeNull();
      expect(studentProgramName).not.toBeNull();
      expect(studentSubjectName).not.toBeNull();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await createQuestion(page, {
        programName: studentProgramName!,
        subjectName: studentSubjectName!,
        questionType: "true_false",
        questionText: objectiveQuestionText,
      });
      const descriptiveQuestionId = await createQuestion(page, {
        programName: studentProgramName!,
        subjectName: studentSubjectName!,
        questionType: "essay_manual_review",
        questionText: descriptiveQuestionText,
      });

      const pendingExamId = await createExamShell(page, {
        examTitle: pendingExamTitle,
        examCode: `PW-MP-${uniqueSeed}`,
        academicYearName: studentAcademicYearName!,
        programName: studentProgramName!,
      });
      cleanupExamIds.push(pendingExamId);
      await attachQuestionToExam(page, {
        examId: pendingExamId,
        questionText: objectiveQuestionText,
        marks: "1",
      });
      await assignStudentToExam(page, pendingExamId, studentProfileId!);
      await configureExamAndPublish(page, {
        examId: pendingExamId,
        totalMarks: "1",
        passingMarks: "1",
        startAt,
        endAt,
        patch: {
          result_publish_mode: "scheduled",
          review_mode: "attempted_only",
          allow_review_after_submit: true,
          show_result_immediately: false,
        },
      });
      await expectExamDeliveryContract(page, pendingExamId, {
        resultPublishMode: "scheduled",
        reviewMode: "attempted_only",
        allowReviewAfterSubmit: true,
        showResultImmediately: false,
      });

      const summaryOnlyExamId = await createExamShell(page, {
        examTitle: summaryOnlyExamTitle,
        examCode: `PW-MS-${uniqueSeed}`,
        academicYearName: studentAcademicYearName!,
        programName: studentProgramName!,
      });
      cleanupExamIds.push(summaryOnlyExamId);
      await attachQuestionToExam(page, {
        examId: summaryOnlyExamId,
        questionText: objectiveQuestionText,
        marks: "1",
      });
      await assignStudentToExam(page, summaryOnlyExamId, studentProfileId!);
      await configureExamAndPublish(page, {
        examId: summaryOnlyExamId,
        totalMarks: "1",
        passingMarks: "1",
        startAt,
        endAt,
        patch: {
          result_publish_mode: "scheduled",
          review_mode: "none",
          allow_review_after_submit: false,
          show_result_immediately: false,
        },
      });
      await expectExamDeliveryContract(page, summaryOnlyExamId, {
        resultPublishMode: "scheduled",
        reviewMode: "none",
        allowReviewAfterSubmit: false,
        showResultImmediately: false,
      });

      const reviewReadyExamId = await createExamShell(page, {
        examTitle: reviewReadyExamTitle,
        examCode: `PW-MR-${uniqueSeed}`,
        academicYearName: studentAcademicYearName!,
        programName: studentProgramName!,
      });
      cleanupExamIds.push(reviewReadyExamId);
      await attachQuestionToExam(page, {
        examId: reviewReadyExamId,
        questionText: objectiveQuestionText,
        marks: "1",
      });
      await assignStudentToExam(page, reviewReadyExamId, studentProfileId!);
      await configureExamAndPublish(page, {
        examId: reviewReadyExamId,
        totalMarks: "1",
        passingMarks: "1",
        startAt,
        endAt,
        patch: {
          result_publish_mode: "immediate",
          review_mode: "attempted_only",
          allow_review_after_submit: true,
          show_result_immediately: true,
        },
      });
      await expectExamDeliveryContract(page, reviewReadyExamId, {
        resultPublishMode: "immediate",
        reviewMode: "attempted_only",
        allowReviewAfterSubmit: true,
        showResultImmediately: true,
      });

      const descriptiveExamId = await createExamShell(page, {
        examTitle: descriptiveExamTitle,
        examCode: `PW-MD-${uniqueSeed}`,
        academicYearName: studentAcademicYearName!,
        programName: studentProgramName!,
      });
      cleanupExamIds.push(descriptiveExamId);
      await attachQuestionToExam(page, {
        examId: descriptiveExamId,
        questionText: descriptiveQuestionText,
        marks: "10",
      });
      await assignStudentToExam(page, descriptiveExamId, studentProfileId!);
      await configureExamAndPublish(page, {
        examId: descriptiveExamId,
        totalMarks: "10",
        passingMarks: "4",
        startAt,
        endAt,
        patch: {
          result_publish_mode: "scheduled",
          review_mode: "attempted_only",
          allow_review_after_submit: true,
          show_result_immediately: false,
        },
      });
      await expectExamDeliveryContract(page, descriptiveExamId, {
        resultPublishMode: "scheduled",
        reviewMode: "attempted_only",
        allowReviewAfterSubmit: true,
        showResultImmediately: false,
      });

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await startAttempt(page, pendingExamId, pendingExamTitle);
      await answerObjectiveAndSubmit(page, 1);

      const summaryOnlyAttemptId = await startAttempt(page, summaryOnlyExamId, summaryOnlyExamTitle);
      await answerObjectiveAndSubmit(page, 1);

      const reviewReadyAttemptId = await startAttempt(page, reviewReadyExamId, reviewReadyExamTitle);
      await answerObjectiveAndSubmit(page, 1);

      const descriptiveAttemptId = await startAttempt(page, descriptiveExamId, descriptiveExamTitle);
      await answerDescriptiveViaApi(page, {
        attemptId: descriptiveAttemptId,
        questionId: descriptiveQuestionId,
        answerText: `This is a mixed-state descriptive answer ${uniqueSeed}.`,
      });

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await markExamCompleted(page, summaryOnlyExamId);
      await publishExamResults(page, summaryOnlyExamId);
      await expectExamDeliveryContract(page, summaryOnlyExamId, {
        resultPublishMode: "scheduled",
        reviewMode: "none",
        allowReviewAfterSubmit: false,
        showResultImmediately: false,
      });

      await markExamCompleted(page, descriptiveExamId);
      const reviewTaskId = await waitForReviewTaskInQueue(page, descriptiveExamId);
      expect(reviewTaskId).not.toBeNull();
      const moderationResponse = await requestBackendJson(page, `/api/v1/attempts/review-tasks/${reviewTaskId}/moderate/`, {
        method: "POST",
        data: {
          marks_awarded: "8.00",
          review_notes: `Mixed-state descriptive moderation ${uniqueSeed}`,
        },
      });
      expect(moderationResponse.response.ok(), moderationResponse.bodyText).toBe(true);
      await publishExamResults(page, descriptiveExamId);
      await expectExamDeliveryContract(page, descriptiveExamId, {
        resultPublishMode: "scheduled",
        reviewMode: "attempted_only",
        allowReviewAfterSubmit: true,
        showResultImmediately: false,
      });

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await expect
        .poll(
          async () => {
            await page.goto("/app/results");
            const checks = await Promise.all([
              page.locator(".studentResultsTable tbody tr").first().isVisible().catch(() => false),
              resultRowByTitle(page, summaryOnlyExamTitle).isVisible().catch(() => false),
              resultRowByTitle(page, reviewReadyExamTitle).isVisible().catch(() => false),
              resultRowByTitle(page, descriptiveExamTitle).isVisible().catch(() => false),
            ]);
            return checks.every(Boolean);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      await page.goto("/app/results?result_status=pending");
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=pending/);
      const pendingRow = resultRowByTitle(page, pendingExamTitle);
      await expect(pendingRow).toBeVisible();
      await expect(pendingRow).toContainText(/pending/i);
      await pendingRow.click();
      let resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await expect(resultModal.getByRole("link", { name: /open answer review/i })).toHaveCount(0);
      await resultModal.getByRole("link", { name: /open summary/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/evaluation pending|awaiting publication/i).first()).toBeVisible();
      await expect(page.getByText(/review locked/i).first()).toBeVisible();

      await page.goto("/app/results?result_group=review");
      await expect(page.getByText(/group: review/i).first()).toBeVisible();

      const summaryOnlyRow = resultRowByTitle(page, summaryOnlyExamTitle);
      await expect(summaryOnlyRow).toBeVisible();
      await expect(summaryOnlyRow).toContainText(/published|pass|fail/i);
      await summaryOnlyRow.click();
      resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await resultModal.getByRole("link", { name: /open summary/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${summaryOnlyAttemptId}/summary(?:\\?.*)?$`));
      await expect(page.getByText(/result published/i).first()).toBeVisible();
      await expect(page.getByText(/answer review locked|review locked/i).first()).toBeVisible();

      await page.goto("/app/results?result_status=review_ready");
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_status=review_ready/);

      const reviewReadyRow = resultRowByTitle(page, reviewReadyExamTitle);
      await expect(reviewReadyRow).toBeVisible();
      await expect(reviewReadyRow).toContainText(/available/i);
      await reviewReadyRow.click();
      resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await expect(resultModal.getByRole("link", { name: /open answer review/i })).toBeVisible();
      await resultModal.getByRole("link", { name: /open answer review/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${reviewReadyAttemptId}/review(?:\\?.*)?$`));
      await expect(page.getByText(/review available/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open summary/i }).first()).toBeVisible();

      await page.goto("/app/results?result_status=review_ready&result_sort=latest");
      const descriptiveRow = resultRowByTitle(page, descriptiveExamTitle);
      await expect(descriptiveRow).toBeVisible();
      await expect(descriptiveRow).toContainText(/available/i);
      await descriptiveRow.click();
      resultModal = resultDetailsModal(page);
      await expect(resultModal).toBeVisible();
      await expect(resultModal.getByRole("link", { name: /open answer review/i })).toBeVisible();
      await resultModal.getByRole("link", { name: /open answer review/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${descriptiveAttemptId}/review(?:\\?.*)?$`));
      await expect(page.getByText(new RegExp(escapeRegExp(descriptiveQuestionText), "i")).first()).toBeVisible();
      await expect(page.getByText(/8(\.00)? final score|80%/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /view analytics/i }).first()).toBeVisible();

      await page.getByRole("link", { name: /view analytics/i }).first().click();
      await expect(page).toHaveURL(/\/app\/analytics(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(`PW-MD-${uniqueSeed}|${escapeRegExp(descriptiveExamTitle)}`, "i")).first()).toBeVisible();
    } finally {
      if (cleanupExamIds.length) {
        const accessToken = await getInstituteCleanupAccessToken(page);
        for (const examId of cleanupExamIds) {
          const response = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          });
          expect(response.ok(), await response.text()).toBe(true);
        }
      }
    }
  });
});
