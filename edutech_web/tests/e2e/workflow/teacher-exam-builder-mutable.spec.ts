import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableExamBuilderActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Teacher mutable exam builder actions", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableExamBuilderActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_BUILDER_ACTIONS",
      "disposable teacher builder coverage",
    ),
  );

  test("@workflow @mutable teacher can create a disposable exam shell and mutate sections and linked questions", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Builder ${uniqueSeed}`;
    const examCode = `PW-TB-${uniqueSeed}`;
    const updatedExamTitle = `${examTitle} Updated`;
    const updatedExamCode = `${examCode}-U`;
    const sectionName = `PW Section ${uniqueSeed}`;
    const examDescription = "Disposable builder settings updated by Playwright.";
    const examInstructions = "Read each question carefully before submitting this disposable builder exam.";
    let examId: string | null = null;

    try {
      await page.goto("/teacher/exams/new");
      await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await page.getByRole("button", { name: /create exam shell/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\?message=/);
      await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

      const builderBaseUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = builderBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await page.locator('input[name="title"]').fill(updatedExamTitle);
      await page.locator('input[name="code"]').fill(updatedExamCode);
      await page.locator('input[name="duration_minutes"]').fill("75");
      await page.locator('input[name="total_marks"]').fill("12");
      await page.locator('input[name="passing_marks"]').fill("5");
      await page.locator('textarea[name="description"]').fill(examDescription);
      await page.locator('textarea[name="instructions"]').fill(examInstructions);
      await page.locator('input[name="allow_late_submit"]').check();
      await page.locator('input[name="randomize_questions"]').check();
      await page.getByRole("button", { name: /save exam settings/i }).click();
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?message=/);
      await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

      await page.goto(builderBaseUrl);
      await expect(page.locator('input[name="title"]')).toHaveValue(updatedExamTitle);
      await expect(page.locator('input[name="code"]')).toHaveValue(updatedExamCode);
      await expect(page.locator('input[name="duration_minutes"]')).toHaveValue("75");
      await expect(page.locator('input[name="total_marks"]')).toHaveValue("12.00");
      await expect(page.locator('input[name="passing_marks"]')).toHaveValue("5.00");
      await expect(page.locator('textarea[name="description"]')).toHaveValue(examDescription);
      await expect(page.locator('textarea[name="instructions"]')).toHaveValue(examInstructions);
      await expect(page.locator('input[name="allow_late_submit"]')).toBeChecked();
      await expect(page.locator('input[name="randomize_questions"]')).toBeChecked();

      await page.goto(`/teacher/exams/${examId}/builder?tab=questions`);
      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?tab=questions/);
      await expect(page.getByText(/question mapping/i).first()).toBeVisible();

      await page.getByRole("tab", { name: /sections/i }).click();
      await expect(page.getByText(/add a new section/i).first()).toBeVisible();

      await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
      await page.getByRole("spinbutton", { name: /total questions/i }).fill("2");
      await page.getByRole("button", { name: /^add section$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section added/i)).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(sectionName), "i")).first()).toBeVisible();

      await page.getByRole("tab", { name: /linked questions/i }).click();
      await expect(page.getByText(/attach one question manually/i)).toBeVisible();

      const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
        has: page.getByText(/attach one question manually/i),
      }).first();
      const questionSelect = manualAttachForm.locator('select[name="question"]');
      const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label,
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      expect(questionOptions.length).toBeGreaterThan(0);
      await questionSelect.selectOption(questionOptions[0]!.value);

      const sectionSelect = manualAttachForm.locator('select[name="section"]');
      const sectionOption = await sectionSelect.locator("option").evaluateAll(
        (options, targetSectionName) =>
          options
            .map((option) => ({
              value: (option as HTMLOptionElement).value,
              label: (option as HTMLOptionElement).label,
            }))
            .find((option) => option.label.trim() === targetSectionName) ?? null,
        sectionName,
      );
      expect(sectionOption).not.toBeNull();
      await sectionSelect.selectOption(sectionOption!.value);

      await manualAttachForm.getByRole("spinbutton", { name: /question order/i }).fill("1");
      await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("5");
      await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("1");
      await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/question linked to exam/i)).toBeVisible();

      const linkedQuestionCard = page.locator(".builderQuestionCard").first();
      await expect(linkedQuestionCard).toBeVisible();
      await expect(linkedQuestionCard).toContainText(sectionName);
      await expect(linkedQuestionCard).toContainText(/5(?:\.00)? marks/i);
      await expect(linkedQuestionCard).toContainText(/1(?:\.00)? negative/i);

      const linkedQuestionForm = linkedQuestionCard.locator("form.builderQuestionEditorGrid");
      await linkedQuestionForm.getByRole("spinbutton", { name: /^marks$/i }).fill("6");
      await linkedQuestionForm.getByRole("spinbutton", { name: /negative marks/i }).fill("2");
      await linkedQuestionForm.getByRole("button", { name: /save changes/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/linked question updated/i)).toBeVisible();
      await expect(linkedQuestionCard).toContainText(/6(?:\.00)? marks/i);
      await expect(linkedQuestionCard).toContainText(/2(?:\.00)? negative/i);

      await linkedQuestionCard.getByRole("button", { name: /^remove$/i }).click();
      await expect(page).toHaveURL(/tab=questions&message=/);
      await expect(page.getByText(/linked question removed/i)).toBeVisible();
      await expect(page.locator(".builderQuestionCard")).toHaveCount(0);

      await page.getByRole("tab", { name: /sections/i }).click();

      const sectionRow = page.locator(".builderListRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(sectionName), "i")).first(),
      }).first();
      await expect(sectionRow).toBeVisible();
      await sectionRow.getByRole("button", { name: /^remove$/i }).click();
      await expect(page).toHaveURL(/tab=sections&message=/);
      await expect(page.getByText(/section removed/i)).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(sectionName), "i"))).toHaveCount(0);
    } finally {
      if (examId) {
        const deleteResponse = await page.request.delete(`/api/teacher/exams/${examId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
