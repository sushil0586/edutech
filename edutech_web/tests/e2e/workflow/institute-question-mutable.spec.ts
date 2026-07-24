import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteQuestionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await expect
    .poll(
      async () => {
        const values = await locator.locator("option").evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        );
        return firstNonEmptyOptionValue(values);
      },
      {
        timeout: 15000,
        message: "Expected hydrated select options to include a non-empty value.",
      },
    )
    .not.toBeNull();

  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = firstNonEmptyOptionValue(values);
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function getNonEmptyOptions(locator: Locator) {
  return locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label.trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
}

async function selectInstituteAcademicLane(
  programSelect: Locator,
  subjectSelect: Locator,
  topicSelect: Locator,
) {
  await selectFirstNonEmptyOption(programSelect);
  await expect(subjectSelect).toBeEnabled();
  await expect
    .poll(async () => (await getNonEmptyOptions(subjectSelect)).length, {
      timeout: 15000,
      message: "Expected institute subject options to hydrate.",
    })
    .toBeGreaterThan(0);

  const subjectOptions = await getNonEmptyOptions(subjectSelect);
  expect(subjectOptions.length).toBeGreaterThan(0);

  for (const subjectOption of subjectOptions) {
    await subjectSelect.selectOption(subjectOption.value);
    await expect(topicSelect).toBeEnabled();

    await pageWait(250);
    const selectableTopics = await getNonEmptyOptions(topicSelect);
    if (selectableTopics.length > 0) {
      await topicSelect.selectOption(selectableTopics[0]!.value);
      return;
    }
  }

  throw new Error("Expected at least one institute subject option to provide a selectable topic.");
}

async function pageWait(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getAccessToken(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function firstAvailableTagOption(tagSelect: Locator) {
  await expect
    .poll(async () => {
      const options = await tagSelect.locator("option").evaluateAll((nodes) =>
        nodes
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label.trim(),
          }))
          .filter((option) => option.value.trim().length > 0),
      );
      return options[0] ?? null;
    }, {
      timeout: 15000,
      message: "Expected at least one selectable institute tag option on the detail route.",
    })
    .not.toBeNull();

  const options = await tagSelect.locator("option").evaluateAll((nodes) =>
    nodes
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label.trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  return options[0]!;
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

      await selectInstituteAcademicLane(programSelect, subjectSelect, topicSelect);

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

  test("@workflow @mutable institute can enrich a disposable question with tags and attachments from the detail route", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Institute detail mutable question ${uniqueSeed}`;
    let questionId: string | null = null;
    let accessToken = "";
    let selectedTagLabel = "";

    try {
      accessToken = await getAccessToken(page);
      expect(accessToken).not.toBe("");

      await page.goto("/institute/question-bank/new");
      await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

      const programSelect = page.locator('select[name="program"]');
      const subjectSelect = page.locator('select[name="subject"]');
      const topicSelect = page.locator('select[name="topic"]');
      const questionTypeSelect = page.locator('select[name="question_type"]');

      await selectInstituteAcademicLane(programSelect, subjectSelect, topicSelect);

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
      await page.locator('textarea[name="explanation"]').fill(
        "Institute detail mutable explanation for enrichment coverage.",
      );

      const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
      if (await acceptedAnswers.isVisible()) {
        await acceptedAnswers.fill("Institute enrichment answer");
      }

      const reviewGuidance = page.locator('textarea[name="review_guidance"]');
      if (await reviewGuidance.isVisible()) {
        await reviewGuidance.fill("Institute detail review guidance.");
      }

      await page.getByLabel(/save as draft/i).check();
      await page.getByRole("button", { name: /^create question$/i }).click();

      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      questionId = detailBaseUrl.match(/\/institute\/question-bank\/([^/?#]+)/)?.[1] ?? null;
      expect(questionId).not.toBeNull();

      const tagSelect = page.locator('select[name="tag_id"]');
      await expect(tagSelect).toBeVisible();
      const chosenTag = await firstAvailableTagOption(tagSelect);
      selectedTagLabel = chosenTag.label.replace(/\s*\([^)]+\)\s*$/, "").trim();
      await tagSelect.selectOption(chosenTag.value);
      await page.getByRole("button", { name: /attach tag/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.getByText(/tag added to the question/i).first()).toBeVisible();
      await expect(
        page.locator(".questionBankTagChip").filter({
          hasText: new RegExp(selectedTagLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        }).first(),
      ).toBeVisible();

      const fileInput = page.locator('input[name="file"]');
      await expect(fileInput).toBeVisible();
      await page.locator('input[name="title"]').fill(`Detail attachment ${uniqueSeed}`);
      await page.locator('textarea[name="alt_text"]').fill("Attachment uploaded by institute detail mutable coverage.");
      await fileInput.setInputFiles({
        name: `detail-attachment-${uniqueSeed}.png`,
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wm9l2QAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await page.getByRole("button", { name: /upload attachment/i }).click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.getByText(/attachment uploaded successfully/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open file/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(`Detail attachment ${uniqueSeed}`, "i")).first()).toBeVisible();

      await page
        .locator(".questionAttachmentCard")
        .filter({ has: page.getByText(new RegExp(`Detail attachment ${uniqueSeed}`, "i")) })
        .getByRole("button", { name: /remove/i })
        .click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.getByText(/attachment removed successfully/i).first()).toBeVisible();

      await page
        .locator(".questionTagForm")
        .filter({
          has: page.locator(".questionBankTagChip").filter({
            hasText: new RegExp(selectedTagLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
          }),
        })
        .getByRole("button", { name: /remove/i })
        .click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);
      await expect(page.getByText(/tag removed from the question/i).first()).toBeVisible();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });
});
