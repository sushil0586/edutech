import { expect, test, type Page } from "@playwright/test";
import type { Locator } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";
import { resolveStudentProfileScope, selectOptionByLabelFragment } from "../helpers/student-scope";

const mutableStudentPracticeActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
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

async function answerCurrentQuestion(page: Page, answerSeed: number) {
  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright practice answer");
}

async function waitForSelectableOption(locator: Locator) {
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

async function selectFirstNonEmptyOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await locator.selectOption(options[0]!);
  return options[0]!;
}

async function selectFirstNonEmptyOptionWithLabel(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        value: (node as HTMLOptionElement).value,
        label: (node as HTMLOptionElement).label || (node as HTMLOptionElement).textContent || "",
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  expect(options.length).toBeGreaterThan(0);
  await locator.selectOption(options[0]!.value);
  return options[0]!;
}

async function selectOptionStartingWithLabel(locator: Locator, labelFragment: string) {
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
    await selectFirstNonEmptyOption(programSelect);
    await expect(subjectSelect).toBeEnabled();
    await waitForSelectableOption(subjectSelect);
  }
  const subjectOption = await selectFirstNonEmptyOptionWithLabel(subjectSelect);
  if (await topicSelect.count()) {
    const topicOptionCount = await topicSelect.locator("option").evaluateAll((nodes) =>
      nodes
        .map((node) => (node as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0).length,
    );
    if (topicOptionCount > 0) {
      await selectFirstNonEmptyOption(topicSelect);
    }
  }

  await page.locator('select[name="question_type"]').selectOption("true_false");
  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page
    .locator('textarea[name="explanation"]')
    .fill("Disposable true/false prompt for student practice mutable coverage.");
  const optionRows = page.locator(".questionEditorOptionRow");
  await expect(optionRows).toHaveCount(2);
  await optionRows.first().locator('input[type="radio"]').check();
  await page.locator('input[name="default_marks"]').fill("2");
  await page.locator('input[name="negative_marks"]').fill("0");

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
  const questionId = page.url().split("?")[0]?.match(/\/teacher\/question-bank\/([^/?#]+)/)?.[1] ?? null;
  expect(questionId).not.toBeNull();

  return {
    questionId: questionId!,
    subjectLabel: subjectOption.label,
  };
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
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

async function expectStudentAvailablePractice(page: Page, examId: string, examTitle: string) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
          headers: {
            Authorization: `Bearer ${await backendAccessToken(page)}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        expect(response.ok(), await response.text()).toBe(true);
        const exams = (await response.json()) as Array<{
          id: string;
          title: string;
          exam_type?: string;
          can_start?: boolean;
          availability_state?: string;
        }>;
        return (
          exams.find((exam) => exam.id === examId || exam.title.trim() === examTitle.trim()) ?? null
        );
      },
      { timeout: 30000 },
    )
    .not.toBeNull();
}

async function expectStudentReviewReadyPractice(page: Page, examId: string, examTitle: string) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`${backendBaseUrl}/api/v1/student/exams/available/`, {
          headers: {
            Authorization: `Bearer ${await backendAccessToken(page)}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        expect(response.ok(), await response.text()).toBe(true);
        const exams = (await response.json()) as Array<{
          id: string;
          title: string;
          review_available?: boolean;
          latest_attempt_status?: string | null;
        }>;
        return (
          exams.find(
            (exam) =>
              (exam.id === examId || exam.title.trim() === examTitle.trim()) &&
              exam.review_available === true,
          ) ?? null
        );
      },
      { timeout: 30000 },
    )
    .not.toBeNull();
}

async function startPracticeFromVisibleCta(page: Page) {
  const startPracticeButton = page.getByRole("button", {
    name: /start practice now|start practice/i,
  }).first();
  await expect(startPracticeButton).toBeVisible();
  await startPracticeButton.click();

  const reachedAttempt = await page
    .waitForURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/, { timeout: 7000 })
    .then(() => true)
    .catch(() => false);
  if (reachedAttempt) {
    return;
  }

  const practiceDialog = page.getByRole("dialog").filter({
    has: page.getByRole("link", { name: /start practice/i }),
  }).first();
  if (await practiceDialog.count()) {
    const dialogStartLink = practiceDialog.getByRole("link", { name: /start practice/i }).first();
    await expect(dialogStartLink).toBeVisible();
    await dialogStartLink.click();
    const reachedAttemptFromDialog = await page
      .waitForURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/, { timeout: 7000 })
      .then(() => true)
      .catch(() => false);
    if (reachedAttemptFromDialog) {
      return;
    }

    await expect(page).toHaveURL(/\/app\/exams\/[^/?#]+(?:\?.*)?$/);
    const detailStartButton = page.getByRole("button", { name: /^start$/i }).first();
    await expect(detailStartButton).toBeVisible();
    await detailStartButton.click();
    await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
    return;
  }

  throw new Error("Practice start CTA did not navigate to an attempt or expose a start link dialog.");
}

async function openPracticeReportAction(
  page: Page,
  examTitle: string,
  actionLabel: RegExp,
) {
  const practiceRow = page.getByRole("button", {
    name: new RegExp(examTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  }).first();
  await expect(practiceRow).toBeVisible();
  await practiceRow.click();

  const practiceDialog = page.getByRole("dialog").filter({
    has: page.getByRole("link", { name: actionLabel }),
  }).first();
  await expect(practiceDialog).toBeVisible();

  const actionLink = practiceDialog.getByRole("link", { name: actionLabel }).first();
  await expect(actionLink).toBeVisible();
  await actionLink.click();
}

async function openPracticePageContainingTitle(
  page: Page,
  examTitle: string,
) {
  const titleLocator = page.getByText(examTitle, { exact: false }).first();
  for (let pageNumber = 0; pageNumber < 5; pageNumber += 1) {
    if (await titleLocator.isVisible().catch(() => false)) {
      return;
    }

    const nextPageLink = page.getByRole("link", { name: /next page/i }).first();
    const nextHref = await nextPageLink.getAttribute("href").catch(() => null);
    if (!nextHref || nextHref === page.url().replace(/^https?:\/\/[^/]+/, "")) {
      break;
    }

    await nextPageLink.click();
    await page.waitForLoadState("domcontentloaded");
  }

  await expect(titleLocator).toBeVisible();
}

async function expectPracticeTitleVisible(
  page: Page,
  examTitle: string,
) {
  await openPracticePageContainingTitle(page, examTitle);
}

test.describe("Student mutable practice actions", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentPracticeActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
      "disposable student practice coverage",
    ),
  );

  test("@workflow @mutable student can start, resume, submit, and review a disposable practice set from the practice lane", async ({
    page,
  }) => {
    test.setTimeout(180000);

    let examId: string | null = null;
    let attemptId: string | null = null;
    const uniqueSeed = Date.now();
    const examTitle = `PW Student Practice ${uniqueSeed}`;
    const examCode = `PW-SP-${uniqueSeed}`;
    const questionText = `PW student practice question ${uniqueSeed}`;
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);
    const reviewAt = new Date(now.getTime() - 2 * 60 * 1000);
    const resultPublishAt = new Date(endAt.getTime() + 5 * 60 * 1000);

    const studentScope = await resolveStudentProfileScope(page);
    const studentDisplayName = studentScope.displayName;
    expect(studentScope.academicYearName).not.toBeNull();
    expect(studentScope.programName).not.toBeNull();

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    try {
      const disposableQuestion = await createDisposableTrueFalseQuestion(page, studentScope.programName!, questionText);

      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('select[name="exam_type"]').selectOption("practice");
      await page.locator('input[name="duration_minutes"]').fill("20");
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(resultPublishAt));
      await page.locator('input[name="review_available_from"]').fill(toDateTimeLocalValue(reviewAt));
      await page.locator('input[name="review_available_until"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      const matchingQuestionOption =
        questionOptions.find((option) => option.value === disposableQuestion.questionId) ?? null;
      expect(matchingQuestionOption).not.toBeNull();
      await questionSelect.selectOption(matchingQuestionOption!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder`);
      await selectOptionByLabelFragment(
        page.locator('select[name="academic_year"]'),
        studentScope.academicYearName!,
      );
      await selectOptionByLabelFragment(
        page.locator('select[name="program"]'),
        studentScope.programName!,
      );
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('.selectionList input[type="checkbox"]');
      await expect
        .poll(async () => await studentCheckboxes.count(), {
          timeout: 15000,
        })
        .toBeGreaterThan(0);
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(studentDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
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

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(resultPublishAt));
      await page.locator('input[name="review_available_from"]').fill(toDateTimeLocalValue(reviewAt));
      await page.locator('input[name="review_available_until"]').fill(toDateTimeLocalValue(endAt));
      await page.locator('input[name="total_marks"]').fill("2");
      await page.locator('input[name="passing_marks"]').fill("1");
      await page.locator('select[name="result_publish_mode"]').selectOption("immediate");
      await page.locator('select[name="review_mode"]').selectOption("attempted_only");
      await page.locator('input[name="show_result_immediately"]').setChecked(true);
      await page.locator('input[name="allow_review_after_submit"]').setChecked(true);
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      await runTeacherExamAction(page, examId!, "sync-marks");
      await runTeacherExamAction(page, examId!, "publish");
      await runTeacherExamAction(page, examId!, "mark-live");

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expectStudentAvailablePractice(page, examId!, examTitle);

      await page.goto("/app/practice?practice_filter=ready");
      await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
      await expectPracticeTitleVisible(page, examTitle);
      await startPracticeFromVisibleCta(page);
      const startedAttemptUrl = page.url();
      const attemptMatch = startedAttemptUrl.match(/\/app\/attempts\/([^/?#]+)/);
      attemptId = attemptMatch?.[1] ?? null;
      expect(attemptId).not.toBeNull();

      await answerCurrentQuestion(page, uniqueSeed);
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/save & recovery status/i).first()).toBeVisible();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
      await expect(page.getByText(/synced/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed action/i).first()).toBeVisible();
      await expect(page.getByText(/last saved answer/i).first()).toBeVisible();

      await page.goto("/app/practice?practice_filter=resume");
      await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
      await expectPracticeTitleVisible(page, examTitle);
      await openPracticeReportAction(page, examTitle, /resume practice/i);

      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();

      const submitButton = page.getByRole("button", { name: /^submit test$/i }).first();
      const summaryUrlPattern = new RegExp(`/app/attempts/${attemptId}/summary\\?`);
      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await submitButton.click();

      const reachedSummaryAfterClick = await page
        .waitForURL(summaryUrlPattern, { timeout: 7000 })
        .then(() => true)
        .catch(() => false);

      if (!reachedSummaryAfterClick) {
        page.once("dialog", async (dialog) => {
          await dialog.accept();
        });
        await submitButton.evaluate((button) => {
          const form = button.closest("form");
          if (!(form instanceof HTMLFormElement)) {
            throw new Error("Submit form was not found for the practice attempt.");
          }
          form.requestSubmit();
        });
        await expect(page).toHaveURL(summaryUrlPattern);
      }

      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const settledNow = new Date();
      const settledEndAt = new Date(settledNow.getTime() - 2 * 60 * 1000);
      const settledResultPublishAt = new Date(settledNow.getTime() - 60 * 1000);
      const settledReviewUntil = new Date(settledNow.getTime() + 60 * 60 * 1000);
      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(settledEndAt));
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(settledResultPublishAt));
      await page.locator('input[name="review_available_from"]').fill(toDateTimeLocalValue(settledResultPublishAt));
      await page.locator('input[name="review_available_until"]').fill(toDateTimeLocalValue(settledReviewUntil));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const markCompletedButton = page.getByRole("button", { name: /mark completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const postSubmitSyncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await postSubmitSyncMarksButton.count()) {
        await postSubmitSyncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);
      await expectStudentReviewReadyPractice(page, examId!, examTitle);

      await page.goto("/app/practice?practice_filter=review");
      await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
      await expectPracticeTitleVisible(page, examTitle);
      await openPracticeReportAction(page, examTitle, /review practice|open summary/i);

      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/review(?:\\?.*)?$`));
      await expect(page.getByRole("heading", { name: /review/i }).first()).toBeVisible();
      await expect(page.getByText(/review state|recommended actions/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
