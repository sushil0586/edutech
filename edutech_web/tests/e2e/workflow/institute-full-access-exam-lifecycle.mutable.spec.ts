import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminInstituteOnboardingPage } from "../page-objects/admin/admin-institute-onboarding.po";
import {
  createDisposableInstitute,
  deleteDisposableInstitute,
  fetchBackendRecords,
  getAdminAccessToken,
  uniqueOnboardingSeed,
} from "../helpers/onboarding";

const mutableRosterActionsEnabled = isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS");
const mutableExamActionsEnabled = isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS");
const mutableOnboardingProfilesEnabled = isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES");
const BULK_IMPORT_FEATURE_CODE = "QUESTION_BANK_BULK_IMPORT";
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const importColumns = [
  "subject",
  "topic",
  "passage_title",
  "passage_order",
  "question_type",
  "difficulty_level",
  "question_text",
  "assertion_text",
  "reason_text",
  "matrix_left_items",
  "matrix_right_items",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_answer",
  "accepted_answers",
  "numeric_tolerance",
  "review_guidance",
  "default_marks",
  "negative_marks",
  "explanation",
  "tags",
] as const;

function buildCsv(columns: string[], rows: Record<string, string>[]) {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns
        .map((column) => {
          const value = row[column] ?? "";
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
        })
        .join(","),
    ),
  ].join("\n");
}

async function createTenQuestionsViaImport(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
  instituteId: string,
) {
  await page.goto("/institute/question-bank/new");
  await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

  const adminAccessToken = await getAdminAccessToken(page);
  const programs = await fetchBackendRecords<{ id: string; name: string; code: string }>(
    page,
    adminAccessToken,
    `/api/v1/academics/programs/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}`,
  );
  expect(programs.length).toBeGreaterThan(0);
  const subjects = await fetchBackendRecords<{ id: string; name: string; code: string; program: string }>(
    page,
    adminAccessToken,
    `/api/v1/academics/subjects/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}`,
  );
  expect(subjects.length).toBeGreaterThan(0);
  const topicGroups = await Promise.all(
    subjects.map(async (subject) => ({
      subject,
      topics: await fetchBackendRecords<{ id: string; name: string; code: string; subject: string }>(
        page,
        adminAccessToken,
        `/api/v1/academics/topics/?is_active=true&page_size=500&institute=${encodeURIComponent(instituteId)}&subject=${encodeURIComponent(subject.id)}`,
      ),
    })),
  );
  const chosenGroup = topicGroups.find((group) => group.topics.length > 1) ?? topicGroups.find((group) => group.topics.length > 0);
  expect(chosenGroup).toBeTruthy();
  const subjectOption = chosenGroup!.subject;
  const topicOptions = chosenGroup!.topics.slice(0, 2);
  expect(topicOptions.length).toBeGreaterThan(0);

  const rows = Array.from({ length: 10 }, (_, index) => ({
    subject: subjectOption.name,
    topic: topicOptions[index % topicOptions.length]!.name,
    passage_title: "",
    passage_order: "",
    question_type: "mcq_single",
    difficulty_level: index < 5 ? "foundation" : "intermediate",
    question_text: `${prefix} question ${index + 1}`,
    assertion_text: "",
    reason_text: "",
    matrix_left_items: "",
    matrix_right_items: "",
    option_1: "Option A",
    option_2: "Option B",
    option_3: "Option C",
    option_4: "Option D",
    correct_answer: "1",
    accepted_answers: "",
    numeric_tolerance: "",
    review_guidance: "",
    default_marks: "1.00",
    negative_marks: "0.00",
    explanation: `${prefix} answer ${index + 1}.`,
    tags: `playwright-import|${index + 1}`,
  }));

  const filePath = testInfo.outputPath(`${prefix.replaceAll(/\s+/g, "-").toLowerCase()}-questions.csv`);
  await writeFile(filePath, buildCsv([...importColumns], rows), "utf8");

  await page.goto("/institute/question-bank/import");
  await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
  const fileInput = page.getByTestId("question-import-file-input");
  await expect(fileInput).toBeVisible();
  await fileInput.setInputFiles(filePath);
  await expect
    .poll(async () => fileInput.evaluate((input) => (input as HTMLInputElement).files?.length ?? 0))
    .toBe(1);
  await fileInput.dispatchEvent("input");
  await fileInput.dispatchEvent("change");
  const previewButton = page.getByRole("button", { name: /preview import/i });
  await expect(previewButton).toBeVisible();
  await expect(previewButton).toBeEnabled();
  const previewResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/question-bank\/preview-import\/?$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await previewButton.click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok(), await previewResponse.text()).toBe(true);
  const previewPayload = (await previewResponse.json()) as {
    blockers?: string[];
    warnings?: string[];
    sections?: Array<{
      name?: string;
      requested?: number;
      resolved?: number;
      blockers?: string[];
      warnings?: string[];
      topic_breakup?: Array<{
        topic_name?: string;
        requested?: number;
        resolved?: number;
      }>;
    }>;
  };
  await testInfo.attach("advanced-builder-preview-payload", {
    body: Buffer.from(JSON.stringify(previewPayload, null, 2)),
    contentType: "application/json",
  });
  console.log("advanced-builder-preview", JSON.stringify(previewPayload, null, 2));
  await expect(page.getByText(/preview generated\./i).first()).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", {
      name: /(?:import valid rows|finalize import) \(10\)/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /(?:import valid rows|finalize import) \(10\)/i,
    }),
  ).toBeEnabled();
  await page.getByRole("button", { name: /(?:import valid rows|finalize import)/i }).click();
  await expect(page.getByText(/10 questions were imported/i).first()).toBeVisible({ timeout: 60000 });

  return {
    subjectName: subjectOption.name,
    topicNames: topicOptions.map((topic) => topic.name),
  };
}

async function createInstituteLoginViaUi(page: Page, instituteId: string): Promise<DirectLoginCredentials> {
  await page.goto(`/admin/institutes?institute=${instituteId}`);
  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(detailCard).toBeVisible();
  const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
  const createLoginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
      response.request().method() === "POST",
  );
  await accountPanel.getByRole("button", { name: /create login/i }).click();
  const createLoginResponse = await createLoginResponsePromise;
  expect(createLoginResponse.ok(), await createLoginResponse.text()).toBe(true);
  const payload = (await createLoginResponse.json()) as { username?: string; generated_password?: string };
  expect(payload.username).toBeTruthy();
  expect(payload.generated_password).toBeTruthy();
  return { username: payload.username!.trim(), password: payload.generated_password!.trim() };
}

async function ensureBulkImportFeatureEnabled(page: Page, instituteId: string) {
  const adminAccessToken = await getAdminAccessToken(page);
  const entitlementResponse = await page.request.get(`${backendBaseUrl}/api/v1/economy/admin/question-bank-entitlements/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  });
  expect(entitlementResponse.ok(), await entitlementResponse.text()).toBe(true);
  const entitlements = (await entitlementResponse.json()) as Array<{
    institute: string;
    question_bank_package: string;
    status: string;
  }>;
  const activeEntitlement = entitlements.find((row) => row.institute === instituteId && row.status === "active");
  expect(activeEntitlement).toBeTruthy();

  const featureResponse = await page.request.post(`${backendBaseUrl}/api/v1/economy/admin/question-bank-feature-entitlements/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
    data: {
      institute: instituteId,
      feature_code: BULK_IMPORT_FEATURE_CODE,
      source_package: activeEntitlement!.question_bank_package,
      metadata: {
        source: "playwright-full-access-exam-lifecycle",
        provisioned_for: "question-import",
      },
    },
  });
  expect(featureResponse.ok(), await featureResponse.text()).toBe(true);
}

async function createTeacherViaUi(page: Page) {
  const uniqueSeed = Date.now();
  await page.goto("/admin/people?view=teachers");
  await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
  await page.getByRole("button", { name: /^create teacher$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /new teacher profile/i })).toBeVisible();
  await dialog.getByLabel(/employee code/i).fill(`PW-T-${uniqueSeed}`);
  await dialog.getByLabel(/first name/i).fill(`PWTeacher${uniqueSeed}`);
  await dialog.getByLabel(/last name/i).fill("Playwright");
  await dialog.getByLabel(/^email$/i).fill(`pw.teacher.${uniqueSeed}@example.test`);
  await dialog.getByLabel(/^phone$/i).fill(`90000${String(uniqueSeed).slice(-5)}`);
  await dialog.getByLabel(/specialization/i).fill("Playwright automation");
  await dialog.getByLabel(/create login after save/i).check();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/admin/people/teachers") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /^create teacher$/i }).last().click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { id?: string };
  expect(payload.id).toBeTruthy();
}

async function createStudentViaUi(page: Page): Promise<DirectLoginCredentials> {
  const uniqueSeed = Date.now();
  let username = `pw.student.${uniqueSeed}`;
  let password = "Student@12345";

  await page.goto("/admin/people?view=students");
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await page.getByRole("button", { name: /^create student$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /new student profile/i })).toBeVisible();
  await dialog.getByLabel(/admission no/i).fill(`PW-S-${uniqueSeed}`);
  await dialog.getByLabel(/first name/i).fill(`PWStudent${uniqueSeed}`);
  await dialog.getByLabel(/last name/i).fill("Playwright");
  await dialog.getByLabel(/^email$/i).fill(`pw.student.${uniqueSeed}@example.test`);
  await dialog.getByLabel(/^phone$/i).fill(`80000${String(uniqueSeed).slice(-5)}`);
  await dialog.getByLabel(/guardian name/i).fill("Playwright Guardian");
  await dialog.getByLabel(/guardian phone/i).fill(`70000${String(uniqueSeed).slice(-5)}`);

  const academicYearValue = (
    await dialog.getByLabel(/academic year/i).locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    )
  ).find((value) => value.trim().length > 0);
  const programValue = (
    await dialog.getByLabel(/program/i).locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    )
  ).find((value) => value.trim().length > 0);
  expect(academicYearValue, "A student academic year must be available for this flow.").toBeTruthy();
  expect(programValue, "A student program must be available for this flow.").toBeTruthy();

  await dialog.getByLabel(/academic year/i).selectOption(academicYearValue!);
  await dialog.getByLabel(/program/i).selectOption(programValue!);
  const cohortOptions = await dialog.getByLabel(/cohort/i).locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value),
  );
  const cohortValue = cohortOptions.find((value) => value.trim().length > 0);
  if (cohortValue) {
    await dialog.getByLabel(/cohort/i).selectOption(cohortValue);
  }
  await dialog.getByLabel(/create login after save/i).uncheck();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/admin/people/students") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /^create student$/i }).last().click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as { id?: string };
  expect(payload.id).toBeTruthy();

  const createLoginResponse = await page.request.post(`/api/admin/account-management/students/${payload.id}/create-login`, {
    data: {
      auto_generate: true,
    },
  });
  expect(createLoginResponse.ok(), await createLoginResponse.text()).toBe(true);
  const createLoginPayload = (await createLoginResponse.json()) as { username?: string; generated_password?: string };
  expect(createLoginPayload.username).toBeTruthy();
  expect(createLoginPayload.generated_password).toBeTruthy();
  username = createLoginPayload.username!.trim();
  password = createLoginPayload.generated_password!.trim();
  return { username, password };
}

async function createAndPublishExam(page: Page, examTitle: string, examCode: string, testInfo: TestInfo, instituteId: string) {
  // Browser automation order:
  // 1. Create 10 real questions from the institute question bank UI.
  // 2. Build and publish a 10-question exam shell from the advanced builder.
  // 3. Switch to the student session and confirm the attempt flow starts cleanly.
  await page.goto("/institute/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();
  const importedScope = await createTenQuestionsViaImport(page, testInfo, examTitle, instituteId);

  await page.goto("/institute/exams/advanced");
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByRole("tab", { name: /02 composition/i }).click();
  await page.getByLabel(/selection mode/i).selectOption("relaxed");
  await page.getByLabel(/question count/i).fill("5");
  const topicRows = page.locator(".advancedBuilderTopicRow");
  while ((await topicRows.count()) < importedScope.topicNames.length) {
    await page.getByRole("button", { name: /add topic/i }).click();
  }
  for (let index = 0; index < importedScope.topicNames.length; index += 1) {
    const topicRow = page.locator(".advancedBuilderTopicRow").nth(index);
    const topicSelect = topicRow.locator("select");
    await expect
      .poll(async () => topicSelect.locator("option").evaluateAll((options) => options.length), {
        timeout: 15000,
      })
      .toBeGreaterThan(1);
    const topicOptionValue = await topicSelect.locator("option").evaluateAll((options) => {
      const match = options.find((option) => (option as HTMLOptionElement).value.trim().length > 0);
      return match ? (match as HTMLOptionElement).value : "";
    });
    expect(topicOptionValue).not.toBe("");
    await topicSelect.selectOption(topicOptionValue);
    await topicRow.locator('input[type="number"]').fill(index === 0 ? "2" : "3");
  }
  await page.getByRole("button", { name: /use available mix/i }).click();
  await expect(
    page.getByText(/difficulty mix was rebalanced to match the currently available inventory\./i).first(),
  ).toBeVisible({ timeout: 30000 });
  const builderPreviewResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/exams/advanced-builder/preview") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /preview exam/i }).click();
  const builderPreviewResponse = await builderPreviewResponsePromise;
  expect(builderPreviewResponse.ok(), await builderPreviewResponse.text()).toBe(true);
  const builderPreviewPayload = (await builderPreviewResponse.json()) as {
    valid?: boolean;
    blockers?: string[];
    warnings?: string[];
    sections?: Array<{
      name?: string;
      requested?: number;
      resolved?: number;
      blockers?: string[];
      warnings?: string[];
      topic_breakup?: Array<{
        topic_name?: string;
        requested?: number;
        resolved?: number;
      }>;
    }>;
  };
  await testInfo.attach("advanced-builder-create-preview", {
    body: Buffer.from(JSON.stringify(builderPreviewPayload, null, 2)),
    contentType: "application/json",
  });
  console.log("advanced-builder-create-preview", JSON.stringify(builderPreviewPayload, null, 2));
  await expect(page.getByText(/preview (ready|refreshed)\./i).first()).toBeVisible({ timeout: 60000 }).catch(() => null);
  await expect(page.getByText(/preview resolution/i).first()).toBeVisible({ timeout: 60000 }).catch(() => null);
  await expect(page.getByRole("button", { name: /create advanced exam/i })).toBeEnabled({ timeout: 60000 });
  await page.getByRole("button", { name: /create advanced exam/i }).click();
  await expect(page).toHaveURL(/\/institute\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  const createdExamId = page.url().match(/\/institute\/exams\/([^/]+)\/builder\?/i)?.[1] ?? null;
  expect(createdExamId, "Created exam id should be present in the builder redirect URL.").toBeTruthy();
  return createdExamId!;
}

async function assignExamToVisibleStudents(page: Page, examId: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
  await page.getByLabel(/assignment mode/i).selectOption("selected_students");
  await page.getByRole("button", { name: /select all/i }).click();
  await page.getByRole("button", { name: /save assignment/i }).click();
  await expect(page.getByText(/student assignment updated\./i).first()).toBeVisible({ timeout: 60000 });
}

async function publishExam(page: Page, examId: string) {
  await page.goto(`/institute/exams/${examId}`);
  await expect(page.getByText(/delivery actions/i).first()).toBeVisible();
  const publishButton = page.getByRole("button", { name: /make exam available/i }).first();
  await expect(publishButton).toBeVisible();
  await publishButton.click();
  await expect(page.getByText(/making available|available/i).first()).toBeVisible({ timeout: 60000 });
}

test.describe("Institute full-access exam lifecycle", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");
  test.skip(
    !mutableOnboardingProfilesEnabled || !mutableRosterActionsEnabled || !mutableExamActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES / PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS / PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
      "browser-only institute onboarding and exam lifecycle coverage",
    ),
  );

  test("@workflow @mutable admin can create a fresh full-access institute, provision login holders, and run a student exam attempt", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = uniqueOnboardingSeed();
    const instituteName = `PW Full Access Institute ${uniqueSeed}`;
    const instituteCode = `PWFA${String(uniqueSeed).slice(-6)}`;
    const examTitle = `PW Full Access Exam ${uniqueSeed}`;
    const examCode = `PW-FA-${String(uniqueSeed).slice(-6)}`;
    const onboardingPage = new AdminInstituteOnboardingPage(page);

    const institute = await createDisposableInstitute(page, {
      name: instituteName,
      code: instituteCode,
      description: "Disposable full-access institute created by Playwright.",
    });

    let instituteLogin: DirectLoginCredentials | null = null;
    let studentLogin: DirectLoginCredentials | null = null;

    try {
      await onboardingPage.gotoMasterDefaults(institute.id);
      await onboardingPage.assertLoaded(institute.id);
      await onboardingPage.selectAcademicPreset("class_7_cbse_core");
      await onboardingPage.selectOnboardingProfile("TRIAL_FULL_ACCESS");
      await onboardingPage.setQuestionBankAccess("enabled");
      await onboardingPage.setAdvancedBuilderAccess("enabled");
      await onboardingPage.previewThenApply();
      await onboardingPage.expectFollowUpSummary(institute.name);
      await ensureBulkImportFeatureEnabled(page, institute.id);

      instituteLogin = await createInstituteLoginViaUi(page, institute.id);
      await createTeacherViaUi(page);
      studentLogin = await createStudentViaUi(page);

      await loginWithCredentials(page, instituteLogin, "institute");
      await expectInstituteWorkspace(page);
      const createdExamId = await createAndPublishExam(page, examTitle, examCode, testInfo, institute.id);
      await assignExamToVisibleStudents(page, createdExamId);
      await publishExam(page, createdExamId);

      await loginWithCredentials(page, studentLogin, "student");
      await page.goto(`/app/exams/${createdExamId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      const startButton = page.getByRole("button", { name: /^(start test|start|start mock test|start exam)$/i }).first();
      await expect(startButton).toBeVisible({ timeout: 30000 });
      await startButton.click();
      await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
      await answerCurrentAttemptQuestion(page, Date.now(), "Playwright full-access answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect(page.getByText(/response updated successfully|saved/i).first()).toBeVisible();
    } finally {
      await deleteDisposableInstitute(page, institute.id);
    }
  });
});
