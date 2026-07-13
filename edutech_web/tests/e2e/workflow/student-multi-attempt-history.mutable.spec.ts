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

type StudentAttemptListItem = {
  id: string;
  exam: string;
  attempt_no: number;
  percentage: string;
  updated_at: string;
};

type StudentResultListItem = {
  id: string;
  exam: string;
  attempt: string;
  percentage: string;
  is_published: boolean;
  published_at: string | null;
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

function attemptCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  });
}

function resultCardByTitle(page: Page, title: string) {
  return page.locator("article.studentResultSurface").filter({
    has: page.locator(".studentResultSurfaceHead strong", { hasText: title }),
  });
}

function summaryLink(card: Locator) {
  return card.locator('a[href*="/summary"]').first();
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
  });

  const bodyText = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  const payload =
    bodyText && contentType.includes("application/json")
      ? (JSON.parse(bodyText) as T)
      : (null as T);
  return { response, payload, bodyText };
}

async function createTrueFalseQuestion(
  page: Page,
  args: {
    programName: string;
    subjectName: string;
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

  await page.locator('select[name="question_type"]').selectOption("true_false");
  await page.locator('textarea[name="question_text"]').fill(args.questionText);
  await page.locator('textarea[name="explanation"]').fill(
    "Deterministic multi-attempt scoring coverage for student history continuity.",
  );

  const optionRows = page.locator(".questionEditorOptionRow");
  await expect(optionRows).toHaveCount(2);
  await optionRows.nth(1).locator('input[type="radio"]').check();
  await page.locator('input[name="default_marks"]').fill("1");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
  const detailUrl = page.url().split("?")[0] ?? page.url();
  const questionId = detailUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
  expect(questionId).not.toBeNull();
  return questionId!;
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

async function chooseCurrentQuestionOption(page: Page, optionIndex: number) {
  const options = page.locator('input[name="selected_option"][type="radio"]:visible');
  await expect(options).toHaveCount(2);
  await ensureToggleChecked(options.nth(optionIndex));
  await expect(options.nth(optionIndex)).toBeChecked();
}

async function answerAttemptWithPattern(page: Page, examTitle: string, optionIndexes: number[]) {
  await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible();
  await expect(page.getByText(/attempt progress/i).first()).toBeVisible();

  for (let index = 0; index < optionIndexes.length; index += 1) {
    await expect(page.getByText(new RegExp(`^question ${index + 1}$`, "i")).first()).toBeVisible();
    await chooseCurrentQuestionOption(page, optionIndexes[index]!);

    if (index < optionIndexes.length - 1) {
      await page.getByRole("button", { name: /^save & next$/i }).click();
      await expect(page.getByText(new RegExp(`^question ${index + 2}$`, "i")).first()).toBeVisible();
    } else {
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(
        page.getByText(/response updated successfully|responses saved/i).first(),
      ).toBeVisible();
    }
  }

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary(?:\?.*)?$/);
  await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
  await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
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

test.describe("Student mutable multi-attempt history continuity", () => {
  test.skip(
    testRequiresRole("institute") || testRequiresRole("student"),
    "Institute and student Playwright credentials are required.",
  );

  test.skip(
    !mutableInstituteResultsActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "student multi-attempt history continuity coverage",
    ),
  );

  test("@workflow @mutable student latest best and lowest attempt stories stay coherent across attempts results compare and timeline", async ({
    page,
  }) => {
    test.setTimeout(300000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentProfileId: string | null = null;
    let studentAcademicYearName: string | null = null;
    let studentProgramName: string | null = null;
    let studentSubjectName: string | null = null;
    let examId: string | null = null;
    const uniqueSeed = Date.now();
    const examTitle = `PW Student Multi Attempt ${uniqueSeed}`;
    const examCode = `PW-SMA-${uniqueSeed}`;
    const questionOneText = `PW multi attempt Q1 ${uniqueSeed}`;
    const questionTwoText = `PW multi attempt Q2 ${uniqueSeed}`;
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
      studentSubjectName =
        studentMe.payload?.student_context?.subject_options?.find((item) => item.label?.trim())?.label?.trim() ??
        null;
      expect(studentProfileId).not.toBeNull();
      expect(studentAcademicYearName).not.toBeNull();
      expect(studentProgramName).not.toBeNull();
      expect(studentSubjectName).not.toBeNull();

      await loginAsRole(page, "institute");
      await expectInstituteWorkspace(page);

      await createTrueFalseQuestion(page, {
        programName: studentProgramName!,
        subjectName: studentSubjectName!,
        questionText: questionOneText,
      });
      await createTrueFalseQuestion(page, {
        programName: studentProgramName!,
        subjectName: studentSubjectName!,
        questionText: questionTwoText,
      });

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

      for (const [index, questionText] of [questionOneText, questionTwoText].entries()) {
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
        await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill(String(index + 1));
        await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("1");
        await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
        await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
        await expect(page).toHaveURL(/tab=questions&message=/);
      }

      await assignStudentToExam(page, examId!, studentProfileId!);

      await page.goto(`/institute/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("2");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      const deliveryUpdate = await requestBackendJson<Record<string, unknown>>(page, `/api/v1/exams/${examId}/`, {
        method: "PATCH",
        data: {
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          total_marks: "2.00",
          passing_marks: "1.00",
          attempt_policy: "unlimited_practice",
          result_publish_mode: "immediate",
          review_mode: "attempted_only",
          allow_review_after_submit: true,
          show_result_immediately: true,
        },
      });
      expect(deliveryUpdate.response.ok(), deliveryUpdate.bodyText).toBe(true);

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

      const attemptOneId = await startAttemptViaApi(page, examId!, studentProfileId!);
      await answerAttemptWithPattern(page, examTitle, [0, 0]);

      const attemptTwoId = await startAttemptViaApi(page, examId!, studentProfileId!);
      await answerAttemptWithPattern(page, examTitle, [1, 1]);

      const attemptThreeId = await startAttemptViaApi(page, examId!, studentProfileId!);
      await answerAttemptWithPattern(page, examTitle, [1, 0]);

      await expect
        .poll(async () => {
          const attemptsResponse = await requestBackendJson<StudentAttemptListItem[]>(
            page,
            "/api/v1/student/attempts/",
          );
          const resultsResponse = await requestBackendJson<StudentResultListItem[]>(
            page,
            "/api/v1/student/results/",
          );
          const attemptIds = attemptsResponse.payload
            ?.filter((item) => item.exam === examId)
            .map((item) => item.id)
            .sort() ?? [];
          const resultAttemptIds = resultsResponse.payload
            ?.filter((item) => item.exam === examId && item.is_published)
            .map((item) => item.attempt)
            .sort() ?? [];
          return JSON.stringify({ attemptIds, resultAttemptIds });
        })
        .toBe(
          JSON.stringify({
            attemptIds: [attemptOneId, attemptTwoId, attemptThreeId].sort(),
            resultAttemptIds: [attemptOneId, attemptTwoId, attemptThreeId].sort(),
          }),
        );

      const attemptsResponse = await requestBackendJson<StudentAttemptListItem[]>(
        page,
        "/api/v1/student/attempts/",
      );
      const resultsResponse = await requestBackendJson<StudentResultListItem[]>(
        page,
        "/api/v1/student/results/",
      );
      const examAttempts =
        attemptsResponse.payload
          ?.filter((item) => item.exam === examId)
          .sort((left, right) => left.attempt_no - right.attempt_no) ?? [];
      const examResults =
        resultsResponse.payload
          ?.filter((item) => item.exam === examId && item.is_published)
          .sort((left, right) => {
            const leftTime = left.published_at ? Date.parse(left.published_at) : 0;
            const rightTime = right.published_at ? Date.parse(right.published_at) : 0;
            return rightTime - leftTime;
          }) ?? [];

      expect(
        examAttempts.map((item) => ({
          attempt: item.id,
          attemptNo: item.attempt_no,
          percentage: item.percentage,
        })),
      ).toEqual([
        { attempt: attemptOneId, attemptNo: 1, percentage: "0.00" },
        { attempt: attemptTwoId, attemptNo: 2, percentage: "100.00" },
        { attempt: attemptThreeId, attemptNo: 3, percentage: "50.00" },
      ]);
      expect(
        examResults.map((item) => ({
          attempt: item.attempt,
          percentage: item.percentage,
        })),
      ).toEqual([
        { attempt: attemptThreeId, percentage: "50.00" },
        { attempt: attemptTwoId, percentage: "100.00" },
        { attempt: attemptOneId, percentage: "0.00" },
      ]);

      await page.goto("/app/attempts?attempt_sort=latest");
      await expect(page).toHaveURL(/\/app\/attempts\?[^#]*attempt_sort=latest/);
      const attemptCards = attemptCardByTitle(page, examTitle);
      await expect(attemptCards).toHaveCount(3);
      await expect(attemptCards.nth(0)).toContainText(/Attempt 3/i);
      await expect(attemptCards.nth(1)).toContainText(/Attempt 2/i);
      await expect(attemptCards.nth(2)).toContainText(/Attempt 1/i);
      await expect(summaryLink(attemptCards.nth(0))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptThreeId}/summary`),
      );
      await expect(summaryLink(attemptCards.nth(1))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptTwoId}/summary`),
      );
      await expect(summaryLink(attemptCards.nth(2))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptOneId}/summary`),
      );

      await page.goto("/app/results?result_status=published&result_sort=latest");
      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_sort=latest/);
      const resultCards = resultCardByTitle(page, examTitle);
      await expect(resultCards).toHaveCount(3);
      await expect(summaryLink(resultCards.nth(0))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptThreeId}/summary`),
      );
      await expect(summaryLink(resultCards.nth(1))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptTwoId}/summary`),
      );
      await expect(summaryLink(resultCards.nth(2))).toHaveAttribute(
        "href",
        new RegExp(`/app/attempts/${attemptOneId}/summary`),
      );

      await summaryLink(resultCards.nth(0)).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptThreeId}/summary(?:\\?.*)?$`));
      await expect(page.getByText(/attempt number/i).first()).toBeVisible();
      await expect(page.getByText(/^3$/).first()).toBeVisible();

      await page.goto("/app/analytics/results/compare");
      await expect(page).toHaveURL(/\/app\/analytics\/results\/compare(?:\?.*)?$/);
      await expect(page.getByText(/best vs latest vs lowest/i).first()).toBeVisible();
      const compareRows = page.locator(".studentTopicRow");
      await expect(compareRows.filter({ has: page.getByText(/^Latest$/i) }).first()).toContainText(/50%/i);
      await expect(compareRows.filter({ has: page.getByText(/^Best$/i) }).first()).toContainText(/100%/i);
      await expect(compareRows.filter({ has: page.getByText(/^Lowest$/i) }).first()).toContainText(/0%/i);

      const compareLedgerRows = page.locator(".dashboardRailRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")),
      });
      await expect(compareLedgerRows).toHaveCount(3);
      await expect(compareLedgerRows.nth(0)).toContainText(/50%/i);
      await expect(compareLedgerRows.nth(1)).toContainText(/100%/i);
      await expect(compareLedgerRows.nth(2)).toContainText(/0%/i);

      await page.goto("/app/analytics/timeline");
      await expect(page).toHaveURL(/\/app\/analytics\/timeline(?:\?.*)?$/);
      const timelineRows = page.locator(".analyticsTimelineItem").filter({
        has: page.getByText(new RegExp(escapeRegExp(examTitle), "i")),
      });
      await expect(timelineRows).toHaveCount(3);
      await expect(timelineRows.nth(0)).toContainText(/50%/i);
      await expect(timelineRows.nth(1)).toContainText(/100%/i);
      await expect(timelineRows.nth(2)).toContainText(/0%/i);
    } finally {
      if (examId) {
        await loginAsRole(page, "institute");
        await expectInstituteWorkspace(page);
        const cleanupResponse = await page.request.delete(`${backendBaseUrl}/api/v1/exams/${examId}/`, {
          headers: {
            Authorization: `Bearer ${await getCurrentSessionAccessToken(page)}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        expect(cleanupResponse.ok(), await cleanupResponse.text()).toBe(true);
      }
    }
  });
});
