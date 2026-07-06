import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { getRoleCredentials } from "../fixtures/env";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectTeacherWorkspace } from "../helpers/navigation";

const mutableQuestionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS",
);
const teacherApiBaseUrl = (
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

type TopicRow = {
  id: string;
  institute: string;
  subject: string;
  name: string;
  code: string;
  difficulty_level?: string;
  sort_order?: number;
  is_active?: boolean;
};

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(
  locator: Locator,
) {
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

async function getTeacherProfile(page: import("@playwright/test").Page, accessToken: string) {
  const response = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Teacher session profile fetch failed with status ${response.status()}`).toBe(
    true,
  );
  const profile = (await response.json()) as SessionProfile;
  expect(profile.institute).toBeTruthy();
  return profile;
}

async function fetchRoleAccessToken(
  page: import("@playwright/test").Page,
  role: "teacher" | "institute",
) {
  const credentials = getRoleCredentials(role);
  expect(credentials).not.toBeNull();

  const response = await page.request.post(`${teacherApiBaseUrl}/api/v1/auth/login/`, {
    data: {
      username: credentials!.username,
      password: credentials!.password,
    },
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), `${role} login for token fetch failed with status ${response.status()}`).toBe(true);
  const payload = (await response.json()) as {
    access?: string;
  };
  const accessToken = payload.access?.trim() ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function getProfileForAccessToken(
  page: import("@playwright/test").Page,
  accessToken: string,
) {
  const response = await page.request.get(`${teacherApiBaseUrl}/api/v1/auth/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Session profile fetch failed with status ${response.status()}`).toBe(true);
  return (await response.json()) as SessionProfile;
}

async function createDisposableTeacherTag(
  page: import("@playwright/test").Page,
  payload: { instituteId: string; uniqueSeed: number },
) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.post(`${teacherApiBaseUrl}/api/v1/question-bank/tags/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: payload.instituteId,
      name: `Teacher Mutable Tag ${payload.uniqueSeed}`,
      code: `PW_TEACHER_TAG_${payload.uniqueSeed}`,
      is_active: true,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Disposable teacher tag create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as QuestionTagRow;
}

async function deleteDisposableTeacherTag(
  page: import("@playwright/test").Page,
  tagId: string,
) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/question-bank/tags/${tagId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function createDisposableTeacherTopic(
  page: import("@playwright/test").Page,
  payload: { instituteId: string; subjectId: string; uniqueSeed: number; accessToken?: string },
) {
  const accessToken = payload.accessToken ?? (await getAccessToken(page));
  expect(accessToken).not.toBe("");

  const response = await page.request.post(`${teacherApiBaseUrl}/api/v1/academics/topics/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      institute: payload.instituteId,
      subject: payload.subjectId,
      parent_topic: null,
      name: `Teacher Mutable Topic ${payload.uniqueSeed}`,
      code: `PW-TEACHER-TOPIC-${payload.uniqueSeed}`,
      description: "Disposable teacher topic created by Playwright for bulk topic reassignment coverage.",
      difficulty_level: "intermediate",
      sort_order: 9999,
      is_active: true,
    },
    timeout: 15000,
  });
  expect(response.ok(), `Disposable teacher topic create failed: ${await response.text()}`).toBe(true);
  return (await response.json()) as TopicRow;
}

async function deleteDisposableTeacherTopic(
  page: import("@playwright/test").Page,
  topicId: string,
  accessTokenOverride?: string,
) {
  const accessToken = accessTokenOverride ?? (await getAccessToken(page));
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/academics/topics/${topicId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function findActiveTeacherTagOption(
  page: import("@playwright/test").Page,
  instituteId: string,
  questionText: string,
) {
  await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
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

  const createdTag = await createDisposableTeacherTag(page, {
    instituteId,
    uniqueSeed: Date.now(),
  });

  await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
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
  },
) {
  await page.goto("/teacher/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');
  const questionTypeSelect = page.locator('select[name="question_type"]');

  const programOptions = await programSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .filter((value) => value.trim().length > 0),
  );

  let selectedProgramId: string | null = null;
  let selectedSubjectId: string | null = null;
  let topicOptions: Array<{ value: string; label: string }> = [];
  let fallbackSelection:
    | {
        programId: string;
        subjectId: string;
        topicOptions: Array<{ value: string; label: string }>;
      }
    | null = null;

  for (const programId of programOptions) {
    await programSelect.selectOption(programId);
    await expect(subjectSelect).toBeEnabled();

    const subjectOptions = await subjectSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );

    for (const subjectId of subjectOptions) {
      await subjectSelect.selectOption(subjectId);
      await expect(topicSelect).toBeEnabled();

      const candidateTopics = await topicSelect.locator("option").evaluateAll((options) =>
        options
          .map((option) => ({
            value: (option as HTMLOptionElement).value,
            label: (option as HTMLOptionElement).label.trim(),
          }))
          .filter((option) => option.value.trim().length > 0),
      );

      if (!candidateTopics.length) {
        continue;
      }

      fallbackSelection ??= {
        programId,
        subjectId,
        topicOptions: candidateTopics,
      };

      if (candidateTopics.length > 1) {
        selectedProgramId = programId;
        selectedSubjectId = subjectId;
        topicOptions = candidateTopics;
        break;
      }
    }

    if (selectedProgramId && selectedSubjectId) {
      break;
    }
  }

  if (!selectedProgramId || !selectedSubjectId) {
    selectedProgramId = fallbackSelection?.programId ?? null;
    selectedSubjectId = fallbackSelection?.subjectId ?? null;
    topicOptions = fallbackSelection?.topicOptions ?? [];
  }

  expect(selectedProgramId).not.toBeNull();
  expect(selectedSubjectId).not.toBeNull();

  await programSelect.selectOption(selectedProgramId!);
  await expect(subjectSelect).toBeEnabled();
  await subjectSelect.selectOption(selectedSubjectId!);
  await expect(topicSelect).toBeEnabled();

  if (!topicOptions.length) {
    topicOptions = await topicSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label.trim(),
        }))
        .filter((option) => option.value.trim().length > 0),
    );
  }
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
  await page.locator('textarea[name="explanation"]').fill("Teacher mutable question explanation.");

  const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
  if (await acceptedAnswers.isVisible()) {
    await acceptedAnswers.fill("Teacher mutable answer");
  }

  const reviewGuidance = page.locator('textarea[name="review_guidance"]');
  if (await reviewGuidance.isVisible()) {
    await reviewGuidance.fill("Award full credit for the intended answer.");
  }

  const saveAsDraft = options?.saveAsDraft ?? true;
  const saveAsDraftCheckbox = page.getByLabel(/save as draft/i);
  if (saveAsDraft) {
    await saveAsDraftCheckbox.check();
  } else {
    await saveAsDraftCheckbox.uncheck();
  }
  await page.getByRole("button", { name: /^create question$/i }).click();
  await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);

  const detailBaseUrl = page.url().split("?")[0] ?? page.url();
  const questionIdMatch = detailBaseUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
  const questionId = questionIdMatch?.[1] ?? null;
  expect(questionId).not.toBeNull();

  return {
    questionId: questionId!,
    selectedProgramId,
    selectedSubjectId,
    selectedTopicId: selectedTopic!.value,
    alternateTopicId: alternateTopic?.value ?? null,
  };
}

test.describe("Teacher mutable question-bank actions", () => {
  test.skip(
    testRequiresRole("teacher"),
    "Teacher Playwright credentials are not configured.",
  );

  test.skip(
    !mutableQuestionActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_QUESTION_BANK_ACTIONS",
      "disposable teacher authoring coverage",
    ),
  );

  test("@workflow @mutable teacher can create, update, and delete a disposable draft question", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const createdQuestionText = `Playwright mutable question ${uniqueSeed}`;
    const updatedExplanation = `Updated explanation for mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      await page.goto("/teacher/question-bank/new");
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

      expect(selectedQuestionType, "Expected at least one question type without option authoring requirements.").not.toBeNull();

      await page.locator('textarea[name="question_text"]').fill(createdQuestionText);
      await page.locator('textarea[name="explanation"]').fill("Initial explanation for mutable question coverage.");

      const acceptedAnswers = page.locator('textarea[name="accepted_answers"]');
      if (await acceptedAnswers.isVisible()) {
        await acceptedAnswers.fill("Playwright mutable answer");
      }

      const reviewGuidance = page.locator('textarea[name="review_guidance"]');
      if (await reviewGuidance.isVisible()) {
        await reviewGuidance.fill("Award full credit when the learner reaches the exact intended answer.");
      }

      await page.getByLabel(/save as draft/i).check();

      await page.getByRole("button", { name: /^create question$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      await expect(page.locator('textarea[name="question_text"]')).toHaveValue(createdQuestionText);

      const detailBaseUrl = page.url().split("?")[0] ?? page.url();
      const questionIdMatch = detailBaseUrl.match(/\/teacher\/question-bank\/([^/?#]+)/);
      questionId = questionIdMatch?.[1] ?? null;
      expect(questionId).not.toBeNull();

      await page.locator('textarea[name="explanation"]').fill(updatedExplanation);
      await page.getByRole("button", { name: /^save question$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\/.+\?message=/);
      await expect(page.locator('textarea[name="explanation"]')).toHaveValue(updatedExplanation);
      await expect(page.getByLabel(/save as draft/i)).toBeChecked();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/teacher/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable teacher can run bulk difficulty and availability actions on a disposable question", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Teacher bulk mutable question ${uniqueSeed}`;
    let questionId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText, {
        saveAsDraft: false,
      });
      questionId = createdQuestion.questionId;

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(
        page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
      ).toBeVisible();

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
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.getByRole("heading", { name: /edit question|duplicate question/i }).first(),
      ).toBeVisible();
      await expect(page.locator('select[name="difficulty_level"]').last()).toHaveValue(
        hardOption!.value,
      );

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.getByRole("button", { name: /deactivate/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      const questionCard = page.locator("article.questionBankCard").filter({
        has: page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();
      await expect(
        questionCard.locator("span.statusPill").filter({ hasText: /inactive/i }).first(),
      ).toBeVisible();

      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.getByRole("button", { name: /^activate$/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await expect(
        questionCard.locator("span.statusPill").filter({ hasText: /active/i }).first(),
      ).toBeVisible();
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/teacher/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
    }
  });

  test("@workflow @mutable teacher can attach and remove a tag through bulk actions on a disposable question", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Teacher bulk tag mutable question ${uniqueSeed}`;
    const accessToken = await getAccessToken(page);
    expect(accessToken).not.toBe("");
    const profile = await getTeacherProfile(page, accessToken);
    let questionId: string | null = null;
    let createdTagId: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText, {
        saveAsDraft: false,
      });
      questionId = createdQuestion.questionId;

      const { bulkBar, tagSelect, chosenTag, createdTagId: disposableTagId } =
        await findActiveTeacherTagOption(page, profile.institute!, questionText);
      createdTagId = disposableTagId;

      const tagName = chosenTag!.label.replace(/\s*\([^)]+\)\s*$/, "").trim();
      await tagSelect.selectOption(chosenTag!.value);
      await bulkBar.getByRole("button", { name: /attach tag/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.locator(".questionBankTagChip").filter({
          hasText: new RegExp(tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        }).first(),
      ).toBeVisible();

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await bulkBar.getByLabel(/select visible questions/i).check();
      await tagSelect.selectOption(chosenTag!.value);
      await bulkBar.getByRole("button", { name: /remove tag/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      await page.goto(`/teacher/question-bank?search=${encodeURIComponent(questionText)}`);
      await page.getByRole("link", { name: /edit|duplicate to edit/i }).first().click();
      await expect(
        page.locator(".questionBankTagChip").filter({
          hasText: new RegExp(tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        }),
      ).toHaveCount(0);
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/teacher/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
      if (createdTagId) {
        await deleteDisposableTeacherTag(page, createdTagId);
      }
    }
  });

  test("@workflow @mutable teacher can change topic through a bulk action on a disposable question", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    test.slow();

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    const uniqueSeed = Date.now();
    const questionText = `Teacher bulk topic mutable question ${uniqueSeed}`;
    const accessToken = await getAccessToken(page);
    expect(accessToken).not.toBe("");
    const profile = await getTeacherProfile(page, accessToken);
    let questionId: string | null = null;
    let createdTopicId: string | null = null;
    let topicAdminAccessToken: string | null = null;

    try {
      const createdQuestion = await createDisposableQuestion(page, questionText, {
        saveAsDraft: false,
      });
      questionId = createdQuestion.questionId;
      let targetTopicId = createdQuestion.alternateTopicId;

      if (!targetTopicId) {
        const instituteAccessToken = await fetchRoleAccessToken(page, "institute");
        const instituteProfile = await getProfileForAccessToken(page, instituteAccessToken);

        test.skip(
          instituteProfile.institute !== profile.institute,
          "Institute-admin credential does not point to the teacher's institute, so disposable academic topic provisioning would not be truthful.",
        );

        const createdTopic = await createDisposableTeacherTopic(page, {
          instituteId: profile.institute!,
          subjectId: createdQuestion.selectedSubjectId,
          uniqueSeed,
          accessToken: instituteAccessToken,
        });
        createdTopicId = createdTopic.id;
        topicAdminAccessToken = instituteAccessToken;
        targetTopicId = createdTopic.id;
      }

      await page.goto(
        `/teacher/question-bank?search=${encodeURIComponent(questionText)}&program=${encodeURIComponent(
          createdQuestion.selectedProgramId,
        )}&subject=${encodeURIComponent(createdQuestion.selectedSubjectId)}`,
      );
      await expect(
        page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
      ).toBeVisible();

      const bulkBar = page.locator("form.questionBankBulkBar").first();
      await bulkBar.getByLabel(/select visible questions/i).check();
      await bulkBar.locator('select[name="topic"]').selectOption(targetTopicId!);
      await bulkBar.getByRole("button", { name: /change topic/i }).click();
      await expect(page).toHaveURL(/\/teacher\/question-bank\?message=/);

      const detailResponse = await page.request.get(
        `/api/teacher/question-bank/questions/${questionId}`,
      );
      expect(detailResponse.ok()).toBe(true);
      const detailPayload = await detailResponse.json();
      expect(detailPayload.topic).toBe(targetTopicId!);
    } finally {
      if (questionId) {
        const deleteResponse = await page.request.delete(`/api/teacher/question-bank/questions/${questionId}`);
        expect(deleteResponse.ok()).toBe(true);
      }
      if (createdTopicId) {
        await deleteDisposableTeacherTopic(page, createdTopicId, topicAdminAccessToken ?? undefined);
      }
    }
  });
});
