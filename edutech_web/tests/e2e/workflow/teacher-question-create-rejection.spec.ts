import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(
  locator: import("@playwright/test").Locator,
) {
  await expect(locator).toBeVisible();
  await expect.poll(async () => {
    const values = await locator.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
    return firstNonEmptyOptionValue(values);
  }).not.toBeNull();

  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = firstNonEmptyOptionValue(values);
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

test.describe("Teacher question create rejection", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher sees truthful validation feedback when question creation is rejected", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/teacher/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const programSelect = page.locator('select[name="program"]').first();
    const subjectSelect = page.locator('select[name="subject"]').first();
    const topicSelect = page.locator('select[name="topic"]').first();
    const questionTypeSelect = page.locator('select[name="question_type"]').first();

    await selectFirstNonEmptyOption(programSelect);
    await expect(subjectSelect).toBeEnabled();
    await selectFirstNonEmptyOption(subjectSelect);
    await expect(topicSelect).toBeVisible();
    await expect.poll(async () => topicSelect.isDisabled().catch(() => true)).toBe(false);

    const topicOptions = await topicSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    if (topicOptions.length > 0) {
      await topicSelect.selectOption(topicOptions[0]!);
    }

    const questionTypeOptions = await questionTypeSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label.trim(),
        }))
        .filter((option) => option.value.trim().length > 0),
    );

    let selectedQuestionType: string | null = null;
    for (const option of questionTypeOptions) {
      await questionTypeSelect.selectOption(option.value);
      const noOptionsRequired = await page.getByText(/no options required/i).first().isVisible().catch(() => false);
      if (!noOptionsRequired) {
        selectedQuestionType = option.value;
        break;
      }
    }

    expect(selectedQuestionType).not.toBeNull();

    const questionText = `Playwright teacher create rejection ${Date.now()}`;
    await page.locator('textarea[name="question_text"]').fill(questionText);
    await page.locator('textarea[name="explanation"]').fill("Intentional rejection coverage for question create.");

    const acceptedAnswers = page.locator('textarea[name="accepted_answers"]').first();
    if (await acceptedAnswers.isVisible().catch(() => false)) {
      await acceptedAnswers.fill("Rejected answer placeholder");
    }

    const reviewGuidance = page.locator('textarea[name="review_guidance"]').first();
    if (await reviewGuidance.isVisible().catch(() => false)) {
      await reviewGuidance.fill("This draft should bounce back with a truthful validation error.");
    }

    await page.getByRole("button", { name: /^create question$/i }).click();

    await expect(page).toHaveURL(/\/teacher\/question-bank\/new\?/);
    await expect(page.getByText(/review the highlighted details/i).first()).toBeVisible();
    await expect(page.locator(".feedbackBanner.feedbackBannerError").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^create question$/i })).toBeVisible();
    await expect(page.locator('textarea[name="question_text"]')).toHaveValue("");
    await expect(
      page.getByText(/option|accepted answers|question text|review guidance|highlighted details/i).first(),
    ).toBeVisible();
  });
});
