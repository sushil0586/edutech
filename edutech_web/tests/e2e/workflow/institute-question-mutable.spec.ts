import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteQuestionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
);

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = firstNonEmptyOptionValue(values);
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

test.describe("Institute mutable question-bank actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteQuestionActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
      "disposable institute authoring coverage",
    ),
  );

  test("@workflow @mutable institute can create, update, and delete a disposable draft question", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const createdQuestionText = `Institute Playwright mutable question ${uniqueSeed}`;
    const updatedExplanation = `Institute updated explanation ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');

      await selectFirstNonEmptyOption(programSelect);
      await expect(subjectSelect).toBeEnabled();
      await selectFirstNonEmptyOption(subjectSelect);
      await expect(topicSelect).toBeEnabled();

      const questionTypeOptions = await questionTypeSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value.trim().length > 0),
      );

      let selectedQuestionType: string | null = null;
      for (const optionValue of questionTypeOptions) {
        await questionTypeSelect.selectOption(optionValue);
        if (await page.getByText(/no options required/i).first().isVisible()) {
          selectedQuestionType = optionValue;
          break;
        }
      }

      expect(selectedQuestionType, "Expected at least one institute question type without option authoring requirements.").not.toBeNull();

      await page.locator('textarea[name="question_text"]').fill(createdQuestionText);
      await page.locator('textarea[name="explanation"]').fill("Initial institute explanation for mutable question coverage.");

      const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
      if (await acceptedAnswers.isVisible()) {
        await acceptedAnswers.fill("Institute mutable answer");
      }

      const reviewGuidance = page.locator('textarea[name="review_guidance"]');
      if (await reviewGuidance.isVisible()) {
        await reviewGuidance.fill("Award full credit when the learner reaches the intended institute answer.");
      }

      await page.getByLabel(/save as draft/i).check();
      await page.getByRole("button", { name: /^create question$/i }).click();

      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.locator('textarea[name="question_text"]')).toHaveValue(createdQuestionText);

      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = detailBaseUrl.match(/\/institute\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.locator('textarea[name="explanation"]').fill(updatedExplanation);
      await page.getByRole("button", { name: /^save question$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.locator('textarea[name="explanation"]')).toHaveValue(updatedExplanation);
      await expect(page.getByLabel(/save as draft/i)).toBeChecked();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
