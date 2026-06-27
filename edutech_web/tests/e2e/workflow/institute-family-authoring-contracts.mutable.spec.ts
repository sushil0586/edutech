import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  fetchAuthProfile,
  fetchPrograms,
  fetchSubjects,
  fetchTopics,
  type ProgramRegistryRecord,
} from "../helpers/assessment-family";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableInstituteQuestionActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function findProgramByFamily(programs: ProgramRegistryRecord[], familyCode: string) {
  return (
    programs.find((program) => program.assessment_family_profile?.code === familyCode) ??
    programs.find((program) =>
      familyCode === "competitive"
        ? /neet|jee|gre|competitive/i.test(`${program.name} ${program.code}`)
        : familyCode === "certification"
          ? /aws|certification/i.test(`${program.name} ${program.code}`)
          : /ielts|pte|toefl|language/i.test(`${program.name} ${program.code}`),
    ) ??
    null
  );
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function createQuestionViaApi(page: Page, payload: Record<string, unknown>) {
  const accessToken = await backendAccessToken(page);
  return page.request.post(`${backendBaseUrl}/api/v1/question-bank/questions/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: payload,
    timeout: 15000,
  });
}

async function deleteQuestionViaApi(page: Page, questionId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${backendBaseUrl}/api/v1/question-bank/questions/${questionId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

async function buildQuestionPayload(
  page: Page,
  program: ProgramRegistryRecord,
  questionType: string,
  uniqueSeed: number,
) {
  const authProfile = await fetchAuthProfile(page);
  expect(authProfile.institute).not.toBeNull();

  const subjects = await fetchSubjects(page, program.id, authProfile.institute);
  const subject = subjects[0] ?? null;
  expect(subject).not.toBeNull();

  const topics = await fetchTopics(page, subject!.id, authProfile.institute);
  const topic = topics[0] ?? null;

  return {
    institute: authProfile.institute,
    program: program.id,
    subject: subject!.id,
    topic: topic?.id ?? null,
    question_type: questionType,
    difficulty_level: "intermediate",
    content_format: "plain_text",
    question_text: `PW institute family contract ${questionType} ${uniqueSeed}`,
    explanation: "Institute family contract automation question.",
    accepted_answers:
      questionType === "short_answer"
        ? ["42", "forty two"]
        : questionType === "numeric_answer"
          ? ["42"]
          : [],
    numeric_tolerance: questionType === "numeric_answer" ? "0.01" : null,
    review_guidance: "",
    default_marks: "1.00",
    negative_marks: questionType === "numeric_answer" ? "0.25" : "0.00",
    is_active: true,
    is_verified: false,
    metadata: {
      is_draft: true,
    },
    ...(authProfile.teacher_profile ? { created_by_teacher: authProfile.teacher_profile } : {}),
    options:
      questionType === "mcq_single"
        ? [
            {
              option_text: "41",
              option_order: 1,
              is_correct: false,
              is_active: true,
              content_format: "plain_text",
            },
            {
              option_text: "42",
              option_order: 2,
              is_correct: true,
              is_active: true,
              content_format: "plain_text",
            },
          ]
        : [],
  };
}

async function selectProgramScope(page: Page, program: ProgramRegistryRecord) {
  const programSelect = page.locator('select[name="program"]');
  const subjectSelect = page.locator('select[name="subject"]');
  const topicSelect = page.locator('select[name="topic"]');

  await programSelect.selectOption(program.id);
  await expect(subjectSelect).toBeEnabled();

  const subjectValue = await subjectSelect.evaluate((select) => {
    const values = Array.from((select as HTMLSelectElement).options)
      .map((item) => item.value)
      .filter(Boolean);
    return values[0] ?? "";
  });
  expect(subjectValue).not.toBe("");
  await subjectSelect.selectOption(subjectValue);
  await expect(topicSelect).toBeEnabled();
}

test.describe("Institute family authoring contracts", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute question editor filters family question types and scoring hints", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const authProfile = await fetchAuthProfile(page);
    expect(authProfile.institute).not.toBeNull();

    const programs = await fetchPrograms(page, authProfile.institute);
    const competitiveProgram = findProgramByFamily(programs, "competitive");
    const certificationProgram = findProgramByFamily(programs, "certification");
    const languageProgram = findProgramByFamily(programs, "language_proficiency");
    test.skip(
      !competitiveProgram || !certificationProgram || !languageProgram,
      "Institute scope does not expose competitive, certification, and language proficiency programs.",
    );

    await page.goto("/institute/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const questionTypeSelect = page.locator('select[name="question_type"]');
    const negativeMarksInput = page.locator('input[name="negative_marks"]');

    await selectProgramScope(page, competitiveProgram!);
    await questionTypeSelect.selectOption("mcq_single");
    const competitiveOptions = await questionTypeSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    expect(competitiveOptions).toContain("numeric_answer");
    expect(competitiveOptions).not.toContain("short_answer");
    await expect(negativeMarksInput.locator("xpath=following-sibling::small").first()).toContainText(
      /usually expects negative marking/i,
    );
    await expect(page.getByText(/this family usually uses negative marking/i)).toBeVisible();

    await page.goto("/institute/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    await selectProgramScope(page, certificationProgram!);
    await questionTypeSelect.selectOption("short_answer");
    const certificationOptions = await questionTypeSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    expect(certificationOptions).toContain("short_answer");
    expect(certificationOptions).not.toContain("matrix_match");
    expect(certificationOptions).not.toContain("numeric_answer");
    await expect(negativeMarksInput.locator("xpath=following-sibling::small").first()).toContainText(
      /usually avoids negative marking/i,
    );

    await page.goto("/institute/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    await selectProgramScope(page, languageProgram!);
    await questionTypeSelect.selectOption("short_answer");
    const languageOptions = await questionTypeSelect.locator("option").evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value.trim().length > 0),
    );
    expect(languageOptions).toContain("short_answer");
    expect(languageOptions).toContain("essay_manual_review");
    expect(languageOptions).not.toContain("numeric_answer");
    expect(languageOptions).not.toContain("matrix_match");
    await expect(negativeMarksInput.locator("xpath=following-sibling::small").first()).toContainText(
      /usually avoids negative marking/i,
    );
  });

  test("@workflow @mutable institute question API enforces competitive, certification, and language family contracts", async ({
    page,
  }) => {
    test.skip(
      !mutableInstituteQuestionActionsEnabled,
      mutableLaneMessage(
        "PLAYWRIGHT_ENABLE_MUTABLE_INSTITUTE_QUESTION_BANK_ACTIONS",
        "institute family authoring contract coverage",
      ),
    );

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const authProfile = await fetchAuthProfile(page);
    expect(authProfile.institute).not.toBeNull();

    const programs = await fetchPrograms(page, authProfile.institute);
    const competitiveProgram = findProgramByFamily(programs, "competitive");
    const certificationProgram = findProgramByFamily(programs, "certification");
    const languageProgram = findProgramByFamily(programs, "language_proficiency");
    test.skip(
      !competitiveProgram || !certificationProgram || !languageProgram,
      "Institute scope does not expose competitive, certification, and language proficiency programs.",
    );

    const uniqueSeed = Date.now();
    const createdQuestionIds: string[] = [];

    try {
      const invalidCompetitivePayload = await buildQuestionPayload(
        page,
        competitiveProgram!,
        "short_answer",
        uniqueSeed,
      );
      const invalidCompetitiveResponse = await createQuestionViaApi(page, invalidCompetitivePayload);
      expect(invalidCompetitiveResponse.status()).toBe(400);
      const invalidCompetitiveBody = (await invalidCompetitiveResponse.json()) as {
        question_type?: string | string[];
      };
      expect(JSON.stringify(invalidCompetitiveBody.question_type ?? "")).toMatch(/not allowed/i);

      const validCompetitivePayload = await buildQuestionPayload(
        page,
        competitiveProgram!,
        "numeric_answer",
        uniqueSeed + 1,
      );
      const validCompetitiveResponse = await createQuestionViaApi(page, validCompetitivePayload);
      expect(validCompetitiveResponse.status()).toBe(201);
      const validCompetitiveBody = (await validCompetitiveResponse.json()) as { id: string };
      createdQuestionIds.push(validCompetitiveBody.id);

      const invalidCertificationPayload = await buildQuestionPayload(
        page,
        certificationProgram!,
        "numeric_answer",
        uniqueSeed + 2,
      );
      const invalidCertificationResponse = await createQuestionViaApi(page, invalidCertificationPayload);
      expect(invalidCertificationResponse.status()).toBe(400);
      const invalidCertificationBody = (await invalidCertificationResponse.json()) as {
        question_type?: string | string[];
      };
      expect(JSON.stringify(invalidCertificationBody.question_type ?? "")).toMatch(/not allowed/i);

      const validCertificationPayload = await buildQuestionPayload(
        page,
        certificationProgram!,
        "short_answer",
        uniqueSeed + 3,
      );
      const validCertificationResponse = await createQuestionViaApi(page, validCertificationPayload);
      expect(validCertificationResponse.status()).toBe(201);
      const validCertificationBody = (await validCertificationResponse.json()) as { id: string };
      createdQuestionIds.push(validCertificationBody.id);

      const invalidLanguagePayload = await buildQuestionPayload(
        page,
        languageProgram!,
        "numeric_answer",
        uniqueSeed + 4,
      );
      const invalidLanguageResponse = await createQuestionViaApi(page, invalidLanguagePayload);
      expect(invalidLanguageResponse.status()).toBe(400);
      const invalidLanguageBody = (await invalidLanguageResponse.json()) as {
        question_type?: string | string[];
      };
      expect(JSON.stringify(invalidLanguageBody.question_type ?? "")).toMatch(/not allowed/i);

      const validLanguagePayload = await buildQuestionPayload(
        page,
        languageProgram!,
        "essay_manual_review",
        uniqueSeed + 5,
      );
      validLanguagePayload.default_marks = "5.00";
      validLanguagePayload.accepted_answers = [];
      validLanguagePayload.negative_marks = "0.00";
      const validLanguageResponse = await createQuestionViaApi(page, validLanguagePayload);
      expect(validLanguageResponse.status()).toBe(201);
      const validLanguageBody = (await validLanguageResponse.json()) as { id: string };
      createdQuestionIds.push(validLanguageBody.id);
    } finally {
      for (const questionId of createdQuestionIds) {
        await deleteQuestionViaApi(page, questionId);
      }
    }
  });
});
