import { expect, test } from "@playwright/test";
import { getRoleCredentials } from "../fixtures/env";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import {
  expectStudentWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

const mutableStudentAttemptActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
);

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

test.describe("Student mutable attempt actions", () => {
  test.skip(
    testRequiresRole("teacher") || testRequiresRole("student"),
    "Teacher and student Playwright credentials are required.",
  );

  test.skip(
    !mutableStudentAttemptActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "disposable student attempt coverage",
    ),
  );

  test("@workflow @mutable student can start, resume, switch sections, and submit a disposable teacher-assigned exam", async ({
    page,
  }) => {
    test.setTimeout(180000);

    const studentCredentials = getRoleCredentials("student");
    expect(studentCredentials).not.toBeNull();

    let studentDisplayName = studentCredentials!.username;
    let examId: string | null = null;
    let attemptId: string | null = null;
    const now = new Date();
    // Keep the exam window comfortably open across timezone/parsing differences
    // on shared stage environments so student-start coverage never depends on
    // minute-boundary or locale drift.
    const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const resultPublishAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

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

    const uniqueSeed = Date.now();
    const examTitle = `PW Student Attempt ${uniqueSeed}`;
    const examCode = `PW-SA-${uniqueSeed}`;
    try {
      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      const examSubjectSelect = page.locator('select[name="subject"]');
      if (await examSubjectSelect.count()) {
        const subjectOptions = await examSubjectSelect.locator("option").evaluateAll((options) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
            }))
            .filter((option) => option.value.trim().length > 0),
        );
        expect(subjectOptions.length).toBeGreaterThan(0);
        await examSubjectSelect.selectOption(subjectOptions[0]!.value);
      }

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.locator('input[name="max_attempts"]').fill("1");
      await page.locator('input[name="result_publish_at"]').fill(toDateTimeLocalValue(resultPublishAt));
      await page.getByRole("button", { name: /^continue$/i }).click();
      await page.getByRole("button", { name: /^continue$/i }).click();

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);

      const detailUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = detailUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.goto(`/teacher/exams/${examId}/builder?tab=sections`);
      await expect(page.getByText(/add a new section/i).first()).toBeVisible();

      const sectionForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/add a new section/i),
      }).first();
      await sectionForm.getByRole("textbox", { name: /section name/i }).fill("Section Alpha");
      await sectionForm.locator('input[name="section_order"]').fill("1");
      await sectionForm.getByRole("button", { name: /add section/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section added\./i)).toBeVisible();

      await sectionForm.getByRole("textbox", { name: /section name/i }).fill("Section Beta");
      await sectionForm.locator('input[name="section_order"]').fill("2");
      await sectionForm.getByRole("button", { name: /add section/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);

      const sectionRows = page.locator(".builderListRow");
      await expect(sectionRows).toHaveCount(2);
      const sectionIds = await sectionRows.locator('input[name="section_id"]').evaluateAll((inputs) =>
        inputs
          .map((input) => (input as HTMLInputElement).value)
          .filter((value) => value.trim().length > 0),
      );
      expect(sectionIds.length).toBeGreaterThanOrEqual(2);

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
      expect(questionOptions.length).toBeGreaterThanOrEqual(2);
      await questionSelect.selectOption(questionOptions[0]!.value);
      await manualAttachForm.locator('select[name="section"]').selectOption(sectionIds[0]!);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("1");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();
      await expect(page.locator(".builderQuestionCard")).toHaveCount(1);

      await questionSelect.selectOption(questionOptions[1]!.value);
      await manualAttachForm.locator('select[name="section"]').selectOption(sectionIds[1]!);
      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("2");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
      await manualAttachForm
        .getByRole("spinbutton", { name: /negative marks/i })
        .fill("1");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.locator(".builderQuestionCard")).toHaveCount(2);

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

      await page.goto(`/teacher/exams/${examId}/builder`);
      await expect(page).toHaveURL(new RegExp(`/teacher/exams/${examId}/builder(?:\\?.*)?$`));
      await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
      await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/message=/);
      await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

      await page.goto(`/teacher/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
      if (await syncMarksButton.count()) {
        await syncMarksButton.click();
        await expect(page).toHaveURL(/message=/);
        await expect(page.getByText(/marks/i).first()).toBeVisible();
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
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();

      const startButton = page.getByRole("button", {
        name: /^(start|start (mock test|practice set|exam))$/i,
      });
      await expect(startButton).toBeVisible();
      await startButton.click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      attemptId = page.url().match(/\/app\/attempts\/([^/?#]+)/)?.[1] ?? null;
      expect(attemptId).not.toBeNull();
      const currentQuestionCard = page.locator("article").filter({
        has: page.getByText(/^question 1$/i),
      }).first();
      await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();
      await expect(page.getByText(/attempt progress/i).first()).toBeVisible();
      await expect(currentQuestionCard.getByText(/last save check/i)).toBeVisible();
      await expect(page.getByText(/save & recovery status/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /current section|open section/i }).first(),
      ).toBeVisible();

      await answerCurrentAttemptQuestion(page, uniqueSeed);

      await page.getByRole("checkbox", { name: /mark for review/i }).check();
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.locator(".feedbackBannerSuccess").filter({
        hasText: /response updated successfully/i,
      }).first()).toBeVisible();
      await expect(page.getByText(/1 saved/i).first()).toBeVisible();
      await expect(page.getByText(/responses saved/i).first()).toBeVisible();
      await expect(page.getByText(/last confirmed save/i).first()).toBeVisible();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();
      await expect(
        page.getByText(/your latest confirmed sync reached the backend|continue steadily and use save answer after changes/i).first(),
      ).toBeVisible();

      const firstSavedAt = (
        await page.locator(".attemptToolbar .examStateSummary").filter({
          has: page.getByText(/^last confirmed save$/i),
        }).locator("strong").first().textContent()
      )?.trim();
      expect(firstSavedAt).toBeTruthy();

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /^resume$/i })).toBeVisible();
      await expect(page.getByText(/active attempt already exists/i).first()).toBeVisible();
      await page.getByRole("link", { name: /^resume$/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));

      const sectionCards = page.locator(".attemptSectionCard");
      await expect(sectionCards).toHaveCount(2);
      const nextSectionCard = sectionCards.filter({
        has: page.getByText(/section beta/i),
      }).first();
      await expect(nextSectionCard.getByRole("button", { name: /open section/i })).toBeVisible();
      await nextSectionCard.getByRole("button", { name: /open section/i }).click();
      await expect(page.getByText(/section switched successfully/i).first()).toBeVisible();
      const sectionBetaQuestionCard = page.locator("article").filter({
        has: page.getByText(/^section beta$/i),
      }).first();
      await expect(sectionBetaQuestionCard).toBeVisible();
      await expect(sectionBetaQuestionCard.getByText(/^question 1$/i)).toBeVisible();

      const afterSwitchSavedAt = (
        await page.locator(".attemptToolbar .examStateSummary").filter({
          has: page.getByText(/^last confirmed save$/i),
        }).locator("strong").first().textContent()
      )?.trim();
      expect(afterSwitchSavedAt).toBe(firstSavedAt);

      await answerCurrentAttemptQuestion(page, uniqueSeed + 1);
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully/i).first()).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^submit test$/i }).click();

      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
      await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
      await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
      await expect(page.getByText(/attempt status/i)).toBeVisible();
      await expect(page.getByText(/review/i).first()).toBeVisible();
      await expect(page.getByText(/evaluation pending/i).first()).toBeVisible();

      await page.goto(`/app/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(examTitle, "i") }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open summary/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /resume/i })).toHaveCount(0);
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
