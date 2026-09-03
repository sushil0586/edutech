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

type SessionProfile = {
  institute?: string | null;
};

type QuestionTagRow = {
  id: string;
  institute: string;
  name: string;
  code: string;
  is_active?: boolean;
};

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function waitForFirstNonEmptyOption(locator: Locator) {
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
      },
    )
    .not.toBeNull();
}

async function fetchInstituteQuestionLookups(
  page: import("@playwright/test").Page,
  params: { program: string; subject?: string },
) {
  const searchParams = new URLSearchParams();
  searchParams.set("program", params.program);
  if (params.subject) {
    searchParams.set("subject", params.subject);
  }
  const response = await page.request.get(`/api/institute/question-bank/create-lookups?${searchParams.toString()}`);
  expect(response.ok()).toBe(true);
  return (await response.json()) as {
    subjects?: Array<{ id: string; name?: string | null }>;
    topics?: Array<{ id: string; subject?: string | null; name?: string | null }>;
  };
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await waitForFirstNonEmptyOption(locator);
  const values = await locator.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const optionValue = firstNonEmptyOptionValue(values);
  expect(optionValue).not.toBeNull();
  await locator.selectOption(optionValue!);
  return optionValue!;
}

async function getAccessToken(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function getInstituteProfile(page: import("@playwright/test").Page, accessToken: string) {
  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Institute session profile fetch failed with status ${response.status()}`).toBe(
    true,
  );
  const profile = (await response.json()) as SessionProfile;
  expect(profile.institute).toBeTruthy();
  return profile;
}

async function createDisposableInstituteTag(
  page: import("@playwright/test").Page,
  payload: { instituteId: string; uniqueSeed: number },
) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.post(`${instituteApiBaseUrl}/api/v1/question-bank/tags/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: payload.instituteId,
      name: `Institute Mutable Tag ${payload.uniqueSeed}`,
      code: `PW_TAG_${payload.uniqueSeed}`,
      is_active: true,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Disposable institute tag create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as QuestionTagRow;
}

async function deleteDisposableInstituteTag(
  page: import("@playwright/test").Page,
  tagId: string,
) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${instituteApiBaseUrl}/api/v1/question-bank/tags/${tagId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function findActiveInstituteTagOption(
  page: import("@playwright/test").Page,
  instituteId: string,
  questionText: string,
) {
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
  const chosenTag = tagOptions.find((option) => option.value.trim().length > 0) ?? null;
  if (chosenTag) {
    return {
      bulkBar,
      tagSelect,
      chosenTag,
      createdTagId: null as string | null,
    };
  }

  const createdTag = await createDisposableInstituteTag(page, {
    instituteId,
    uniqueSeed: Date.now(),
  });

  await page.goto(`/institute/question-bank?search=${encodeURIComponent(questionText)}`);
  await expect(
    page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
  ).toBeVisible();
  await bulkBar.getByLabel(/select visible questions/i).check();

  const refreshedOptions = await tagSelect.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      value: (option as HTMLOptionElement).value,
      label: (option as HTMLOptionElement).label.trim(),
    })),
  );
  const createdOption =
    refreshedOptions.find((option) => option.value === createdTag.id) ??
    refreshedOptions.find((option) => option.label.includes(createdTag.name)) ??
    null;
  expect(createdOption).not.toBeNull();

  return {
    bulkBar,
    tagSelect,
    chosenTag: createdOption!,
    createdTagId: createdTag.id,
  };
}

async function createDisposableQuestion(
  page: import("@playwright/test").Page,
  questionText: string,
  options?: {
    saveAsDraft?: boolean;
    requireAlternateTopic?: boolean;
  },
) {
  await page.goto("/institute/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');
  const questionTypeSelect = page.locator('select[name="question_type"]');

  await selectFirstNonEmptyOption(programSelect);
  const selectedProgramId = await programSelect.inputValue();
  await expect(subjectSelect).toBeEnabled();
  await waitForFirstNonEmptyOption(subjectSelect);
  const subjectOptions = await subjectSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label.trim(),
      }))
      .filter((option) => option.value.trim().length > 0),
  );
  expect(subjectOptions.length).toBeGreaterThan(0);

  let selectedSubjectId = "";
  let selectedTopicId: string | null = null;
  let alternateTopicId: string | null = null;
  const requireAlternateTopic = options?.requireAlternateTopic ?? false;

  for (const subjectOption of subjectOptions) {
    await subjectSelect.selectOption(subjectOption.value);
    selectedSubjectId = subjectOption.value;
    await expect(topicSelect).toBeEnabled();

    const lookupPayload = await fetchInstituteQuestionLookups(page, {
      program: selectedProgramId,
      subject: selectedSubjectId,
    });
    const topicOptions = (lookupPayload.topics ?? []).filter(
      (topic) => topic.id && topic.subject === selectedSubjectId,
    );

    if (requireAlternateTopic) {
      if (topicOptions.length >= 2) {
        selectedTopicId = topicOptions[0]?.id ?? null;
        alternateTopicId = topicOptions[1]?.id ?? null;
        break;
      }
      continue;
    }

    if (topicOptions.length > 0) {
      selectedTopicId = topicOptions[0]?.id ?? null;
      alternateTopicId = topicOptions.find((topic) => topic.id !== selectedTopicId)?.id ?? null;
      break;
    }

    selectedTopicId = null;
    alternateTopicId = null;
    break;
  }

  expect(selectedSubjectId).not.toBe("");

  if (selectedTopicId) {
    await topicSelect.selectOption(selectedTopicId);
  }

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

  const saveAsDraft = options?.saveAsDraft ?? false;
  const saveAsDraftCheckbox = page.getByLabel(/save as draft/i);
  if (saveAsDraft) {
    await saveAsDraftCheckbox.check();
  } else {
    await saveAsDraftCheckbox.uncheck();
  }

  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/institute\/question-bank\/.+\?message=/);

  const detailBaseUrl = page.url().split("?")[0] ?? page.url();
  const questionIdMatch = detailBaseUrl.match(/\/institute\/question-bank\/([^/?#]+)/);
  const questionId = questionIdMatch?.[1] ?? null;
  expect(questionId).not.toBeNull();
  return {
    questionId: questionId!,
    selectedProgramId,
    selectedSubjectId,
    selectedTopicId,
    alternateTopicId,
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

  test("@workflow @mutable institute can create, update, and delete a disposable draft question", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const createdQuestionText = `Institute mutable draft question ${uniqueSeed}`;
    const updatedExplanation = `Updated explanation for institute mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, createdQuestionText, {
        saveAsDraft: true,
      });
      questionId = createdQuestion.questionId;

      await expect(page.locator('textarea[name="question_text"]')).toHaveValue(createdQuestionText);

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

  test("@workflow @mutable institute can run bulk difficulty and availability actions on a disposable question", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Institute bulk mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText, {
        requireAlternateTopic: true,
      });
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
    const accessToken = await getAccessToken(page);
    expect(accessToken).not.toBe("");
    const profile = await getInstituteProfile(page, accessToken);
    let questionId: string | null = null;
    let createdTagId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText);
      questionId = createdQuestion.questionId;

      const { bulkBar, tagSelect, chosenTag, createdTagId: disposableTagId } =
        await findActiveInstituteTagOption(page, profile.institute!, questionText);
      createdTagId = disposableTagId;

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
      if (createdTagId) {
        await deleteDisposableInstituteTag(page, createdTagId);
      }
    }
  });

  test("@workflow @mutable institute can change topic through a bulk action on a disposable question", async ({
    page,
  }) => {
    test.setTimeout(90_000);
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

      await page.goto(
        `/institute/question-bank?search=${encodeURIComponent(questionText)}&program=${encodeURIComponent(
          createdQuestion.selectedProgramId,
        )}&subject=${encodeURIComponent(createdQuestion.selectedSubjectId)}`,
      );
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
