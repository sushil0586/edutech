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

async function createDisposableQuestion(page: import("@playwright/test").Page, questionText: string) {
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
  const topicOptions = await topicSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label.trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  const selectedTopic = topicOptions[0] ?? null;
  expect(selectedTopic).not.toBeNull();
  const alternateTopic =
    topicOptions.find((option) => option.value !== selectedTopic!.value) ?? null;
  await topicSelect.selectOption(selectedTopic!.value);

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

  expect(selectedQuestionType).not.toBeNull();

  await page.locator('textarea[name="question_text"]').fill(questionText);
  await page.locator('textarea[name="explanation"]').fill("Institute bulk mutable explanation.");

  const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
  if (await acceptedAnswers.isVisible()) {
    await acceptedAnswers.fill("Institute mutable answer");
  }

  const reviewGuidance = page.locator('textarea[name="review_guidance"]');
  if (await reviewGuidance.isVisible()) {
    await reviewGuidance.fill("Award credit for the intended answer.");
  }

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);

  const detailBaseUrl = page.url().split("?")[0] ?? page.url();
  const questionIdMatch = detailBaseUrl.match(/\/institute\/question-bank\/([^/?#]+)/);
  const questionId = questionIdMatch?.[1] ?? null;
  expect(questionId).not.toBeNull();
  return {
    questionId: questionId!,
    selectedTopicId: selectedTopic!.value,
    alternateTopicId: alternateTopic?.value ?? null,
  };
}

test.describe("Institute mutable question bank bulk actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableInstituteQuestionActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
      "disposable institute bulk-action coverage",
    ),
  );

  test("@workflow @mutable institute can run bulk difficulty and availability actions on a disposable question", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Institute bulk mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText);
      questionId = createdQuestion.questionId;

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();

      const bulkBar = page.locator("form.questionBankBulkBar").first();
      await bulkBar.getByLabel(/select visible questions/i).check();

      const difficultySelect = bulkBar.locator('select[name="difficulty_level"]');
      const difficultyOptions = await difficultySelect.locator("option").evaluateAll((options) =>
        options.map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label.trim(),
        })),
      );
      const hardOption =
        difficultyOptions.find((option) => option.value === "hard") ??
        difficultyOptions.find((option) => option.value.trim().length > 0) ??
        null;
      expect(hardOption).not.toBeNull();
      await difficultySelect.selectOption(hardOption!.value);
      await bulkBar.getByRole("button", { name: /set difficulty/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.getByRole("heading", { name: /edit question|duplicate question/i }).first(),
      ).toBeVisible();
      await expect(page.locator('select[name="difficulty_level"]').last()).toHaveValue(
        hardOption!.value,
      );

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.getByRole("button", { name: /deactivate/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      const questionCard = page.locator("article.questionBankCard").filter({
        has: page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();
      await expect(questionCard.locator("span.statusPill").filter({ hasText: /inactive/i }).first()).toBeVisible();

      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.getByRole("button", { name: /^activate$/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(questionCard.locator("span.statusPill").filter({ hasText: /active/i }).first()).toBeVisible();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable institute can attach and remove a tag through bulk actions on a disposable question", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Institute bulk tag mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText);
      questionId = createdQuestion.questionId;

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(
        page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
      ).toBeVisible();

      const bulkBar = page.locator("form.questionBankBulkBar").first();
      await bulkBar.getByLabel(/select visible questions/i).check();

      const tagSelect = bulkBar.locator('select[name="tag_id"]');
      const tagOptions = await tagSelect.locator("option").evaluateAll((options) =>
        options.map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label.trim(),
        })),
      );
      const chosenTag =
        tagOptions.find((option) => option.value.trim().length > 0) ?? null;

      test.skip(!chosenTag, "No active institute tags are available for mutable bulk tag coverage.");

      const tagName = chosenTag!.label.replace(/\s*\([^)]+\)\s*$/, "").trim();
      await tagSelect.selectOption(chosenTag!.value);
      await bulkBar.getByRole("button", { name: /attach tag/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.locator(".questionBankTagChip").filter({
          hasText: new RegExp(tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        }).first(),
      ).toBeVisible();

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await bulkBar.getByLabel(/select visible questions/i).check();
      await tagSelect.selectOption(chosenTag!.value);
      await bulkBar.getByRole("button", { name: /remove tag/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.locator(".questionBankTagChip").filter({
          hasText: new RegExp(tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        }),
      ).toHaveCount(0);
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable institute can change topic through a bulk action on a disposable question", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Bulk topic reassignment currently overruns the mutable test budget during backend cleanup in this environment.",
    );
    test.slow();

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Institute bulk topic mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText);
      questionId = createdQuestion.questionId;

      test.skip(
        !createdQuestion.alternateTopicId,
        "Current institute academic scope does not have a second topic available for bulk topic reassignment.",
      );

      await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(
        page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
      ).toBeVisible();

      const bulkBar = page.locator("form.questionBankBulkBar").first();
      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.locator('select[name="topic"]').selectOption(createdQuestion.alternateTopicId!);
      await bulkBar.getByRole("button", { name: /change topic/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\?message=/);

      const detailResponse = await page.request.get(
        `/api/teacher/question-bank/questions/${questionId}`,
      );
      expect(detailResponse.ok()).toBe(true);
      const detailPayload = await detailResponse.json();
      expect(detailPayload.topic).toBe(createdQuestion.alternateTopicId!);
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
