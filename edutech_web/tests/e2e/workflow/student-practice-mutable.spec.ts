import { expect, test, type Page } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentPracticeActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_PRACTICE_ACTIONS",
);

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function resolveStudentDisplayName(page: Page) {
  const studentCredentials = getRoleCredentials("student");
  expect(studentCredentials).not.toBeNull();

  let studentDisplayName = studentCredentials!.username;
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

  return studentDisplayName;
}

async function answerCurrentQuestion(page: Page, answerSeed: number) {
  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright practice answer");
}

async function expectPracticeTitleVisible(
  page: Page,
  examTitle: string,
) {
  await expect(page.getByText(examTitle, { exact: false }).first()).toBeVisible();
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
    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);
    const reviewAt = new Date(now.getTime() - 2 * 60 * 1000);
    const resultPublishAt = new Date(endAt.getTime() + 5 * 60 * 1000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);
    const studentDisplayName = await resolveStudentDisplayName(page);

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    try {
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
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("2");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("0");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}/builder?tab=assignment`);
      await expect(page.getByText(/student assignment/i).first()).toBeVisible();

      const assignmentForm = page.locator("form.builderForm").filter({
        has: page.getByRole("button", { name: /save assignment/i }),
      }).first();
      await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

      const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
      const studentCount = await studentCheckboxes.count();
      expect(studentCount).toBeGreaterThan(0);

      const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(studentDisplayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
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
      await expect(page.getByText(/student assignment updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

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

      await page.goto("/app/practice?practice_filter=ready");
      await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
      await expectPracticeTitleVisible(page, examTitle);
      const startPracticeButton = page.getByRole("button", {
        name: /start practice now|start practice/i,
      }).first();
      await expect(startPracticeButton).toBeVisible();
      await startPracticeButton.click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
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
      const resumeLink = page.locator(`a[href="/app/attempts/${attemptId}"]`).first();
      await expect(resumeLink).toBeVisible();
      await resumeLink.click();

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

      await page.goto("/app/practice?practice_filter=review");
      await expect(page.getByRole("heading", { name: /practice/i }).first()).toBeVisible();
      await expectPracticeTitleVisible(page, examTitle);
      const reviewLink = page.locator(`a[href="/app/attempts/${attemptId}/review"]`).first();
      await expect(reviewLink).toBeVisible();
      await reviewLink.click();

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
