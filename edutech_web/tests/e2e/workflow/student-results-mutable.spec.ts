import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentResultsActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_RESULTS_ACTIONS",
);

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

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let questionId: string | null = null;
    let examId: string | null = null;
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

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);

      await page.goto("/teacher/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
      await selectFirstNonEmptyOption(page, 'select[name="program"]');
      await expect(page.locator('select[name="subject"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="subject"]');
      await expect(page.locator('select[name="topic"]')).toBeEnabled();
      await selectFirstNonEmptyOption(page, 'select[name="topic"]');
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
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();

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

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);
      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
      }).first();

      if (await matchingStudentRow.count()) {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).uncheck().catch(() => null);
        }
        await matchingStudentRow.locator('input[name="student_ids"]').check();
      } else {
        for (let index = 0; index < studentCount; index += 1) {
          await studentCheckboxes.nth(index).check();
        }
      }

      await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
      await expect(page).toHaveURL(/tab=assignment&message=/);

      await page.goto(`/teacher/exams/${examId}/builder`);
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);

      await page.goto(`/teacher/exams/${examId}`);
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
      await expect(
        page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: /^(start|start (mock test|practice set|exam))$/i })
        .click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
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
      await page.getByRole("button", { name: /^submit test$/i }).click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();

      await loginAsRole(page, "teacher");
      await expectTeacherWorkspace(page);
      await page.goto(`/teacher/results?exam=${examId}`);
      const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
      if (await markCompletedButton.count()) {
        await markCompletedButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      const generateResultsButton = page.getByRole("button", { name: /generate results|regenerate summary/i }).first();
      await expect(generateResultsButton).toBeVisible();
      await generateResultsButton.click();
      await expect(page).toHaveURL(/message=/);

      const calculateRanksButton = page.getByRole("button", { name: /calculate ranks|recalculate ranks/i }).first();
      await expect(calculateRanksButton).toBeVisible();
      await calculateRanksButton.click();
      await expect(page).toHaveURL(/message=/);

      const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
      if (await publishResultsButton.isVisible().catch(() => false)) {
        await publishResultsButton.click();
        await expect(page).toHaveURL(/message=/);
      }

      await loginAsRole(page, "student");
      await expectStudentWorkspace(page);

      await expect
        .poll(
          async () => {
            await page.goto("/app/results?result_group=outcome");
            const resultCard = resultCardByTitle(page, examTitle);
            return resultCard.isVisible().catch(() => false);
          },
          { timeout: 30000 },
        )
        .toBe(true);

      await expect(page).toHaveURL(/\/app\/results\?[^#]*result_group=outcome/);
      await expect(page.getByText(/group: outcome/i).first()).toBeVisible();

      const resultCard = resultCardByTitle(page, examTitle);
      await expect(resultCard).toBeVisible();
      await expect(
        page.locator(".studentResultsGroupedSection").filter({
          has: page.locator(".sectionHeading.sectionHeadingCompact strong", {
            hasText: /pass|fail/i,
          }),
        }).locator("article.studentResultSurface").filter({
          has: page.locator(".studentResultSurfaceHead strong", {
            hasText: examTitle,
          }),
        }).first(),
      ).toBeVisible();
      await expect(resultCard.getByText(/evaluation pending/i).first()).toHaveCount(0);
      await expect(resultCard.getByText(/result published/i).first()).toBeVisible();

      const summaryLink = resultCard.getByRole("link", {
        name: /open summary|check attempt status/i,
      });
      await expect(summaryLink).toBeVisible();
      await summaryLink.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/]+\/summary(?:\?.*)?$/);
      await expect(page.getByText(/post-submit state/i).first()).toBeVisible();
      await expect(page.getByText(/result published/i).first()).toBeVisible();
    } finally {
      if (examId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteExamResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteExamResponse.ok()).toBe(true);
      }
      if (questionId) {
        await loginAsRole(page, "teacher");
        await expectTeacherWorkspace(page);
        const deleteQuestionResponse = await page.request.delete(
          `/api/teacher/question-bank/questions/${questionId}`,
        );
        expect(deleteQuestionResponse.ok()).toBe(true);
      }
    }
  });
});
