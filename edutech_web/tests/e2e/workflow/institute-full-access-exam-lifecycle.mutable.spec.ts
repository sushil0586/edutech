import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
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
const execFileAsync = promisify(execFile);
const backendRoot = path.resolve(process.cwd(), "../edutech_backend");
const backendPython = path.join(backendRoot, ".venv/bin/python");
const backendManagePy = path.join(backendRoot, "manage.py");
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

async function attachJsonEvidence(testInfo: TestInfo, name: string, payload: unknown) {
  const filePath = testInfo.outputPath(`${name}.json`);
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  await testInfo.attach(name, {
    path: filePath,
    contentType: "application/json",
  });
  return filePath;
}

async function attachScreenshotEvidence(page: Page, testInfo: TestInfo, name: string) {
  const filePath = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, {
    path: filePath,
    contentType: "image/png",
  });
  return filePath;
}

type PersistedExamAccessState = {
  exam_id: string;
  status: string;
  start_at: string;
  end_at: string;
  assignments: Array<{
    student_id: string;
    is_active: boolean;
  }>;
};

async function setSyntheticExamAccessState(
  examId: string,
  state: "inactive_assignment" | "future_window" | "expired_window" | "live_window",
) {
  const script = `
import json
import os
from datetime import timedelta
from django.utils import timezone
from apps.exams.models import Exam, ExamStudentAssignment

exam = Exam.objects.get(pk=os.environ["PW_EXAM_ID"])
state = os.environ["PW_EXAM_STATE"]
now = timezone.now()
assignments = ExamStudentAssignment.objects.filter(exam=exam)

if state == "inactive_assignment":
    assignments.update(is_active=False)
    exam.status = "live"
    exam.start_at = now - timedelta(minutes=5)
    exam.end_at = now + timedelta(hours=1)
elif state == "future_window":
    assignments.update(is_active=True)
    exam.status = "scheduled"
    exam.start_at = now + timedelta(days=1)
    exam.end_at = now + timedelta(days=1, hours=1)
elif state == "expired_window":
    assignments.update(is_active=True)
    exam.status = "live"
    exam.start_at = now - timedelta(hours=2)
    exam.end_at = now - timedelta(hours=1)
elif state == "live_window":
    assignments.update(is_active=True)
    exam.status = "live"
    exam.start_at = now - timedelta(minutes=5)
    exam.end_at = now + timedelta(hours=1)
else:
    raise ValueError(f"Unsupported state: {state}")

exam.save(update_fields=["status", "start_at", "end_at", "updated_at"])
print(json.dumps({
    "exam_id": str(exam.id),
    "status": exam.status,
    "start_at": exam.start_at.isoformat(),
    "end_at": exam.end_at.isoformat(),
    "assignments": [
        {"student_id": str(student_id), "is_active": is_active}
        for student_id, is_active in assignments.values_list("student_id", "is_active")
    ],
}, sort_keys=True))
`;
  const { stdout } = await execFileAsync(
    backendPython,
    [backendManagePy, "shell", "-c", script],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        PW_EXAM_ID: examId,
        PW_EXAM_STATE: state,
      },
      maxBuffer: 1024 * 1024,
    },
  );
  const payloadLine = stdout
    .trim()
    .split("\n")
    .reverse()
    .find((line) => line.trim().startsWith("{"));
  expect(payloadLine, `Persisted state output missing for ${state}.`).toBeTruthy();
  return JSON.parse(payloadLine!) as PersistedExamAccessState;
}

async function answerImportedCorrectMcq(page: Page, answerSeed: number, prefix = "Playwright answer") {
  const optionARow = page.locator(".attemptOptionRow").filter({ hasText: /Option A/i }).first();
  const optionARadio = optionARow.locator('input[name="selected_option"][type="radio"]').first();
  if (await optionARadio.count()) {
    await optionARow.click({ force: true });
    await expect(optionARadio).toBeChecked();
    return;
  }

  await answerCurrentAttemptQuestion(page, answerSeed, prefix);
}

async function currentAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

async function backendJson<T>(
  page: Page,
  accessToken: string,
  method: "GET" | "POST",
  path: string,
  data?: Record<string, unknown>,
) {
  const response = await page.request.fetch(`${backendBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data,
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return {
    ok: response.ok(),
    status: response.status(),
    payload: payload as T,
  };
}

type AttemptAnswerEvidence = {
  id: string;
  question: string;
  selected_option: string | null;
  selected_option_text?: string;
  is_correct?: boolean;
  marks_awarded?: string;
};

type AttemptDetailEvidence = {
  id: string;
  status: string;
  attempted_questions: number;
  correct_answers: number;
  final_score: string;
  answers: AttemptAnswerEvidence[];
};

async function fetchAttemptDetail(page: Page, accessToken: string, attemptId: string) {
  const response = await backendJson<AttemptDetailEvidence>(
    page,
    accessToken,
    "GET",
    `/api/v1/attempts/${attemptId}/detail/`,
  );
  expect(response.ok, JSON.stringify(response.payload)).toBe(true);
  return response.payload;
}

async function assertStudentExamDenied(
  page: Page,
  testInfo: TestInfo,
  credentials: DirectLoginCredentials,
  examId: string,
  evidenceName: string,
  persistedState?: PersistedExamAccessState,
) {
  await loginWithCredentials(page, credentials, "student");
  const accessToken = await currentAccessToken(page);
  const profile = await backendJson<{ student_profile?: string | null }>(
    page,
    accessToken,
    "GET",
    "/api/v1/auth/me/",
  );
  expect(profile.ok, JSON.stringify(profile.payload)).toBe(true);
  expect(profile.payload.student_profile).toBeTruthy();

  const detail = await backendJson<Record<string, unknown>>(
    page,
    accessToken,
    "GET",
    `/api/v1/student/exams/${examId}/detail/`,
  );
  const start = await backendJson<Record<string, unknown>>(
    page,
    accessToken,
    "POST",
    "/api/v1/attempts/start/",
    { exam: examId, student: profile.payload.student_profile },
  );
  expect(detail.status).toBe(404);
  expect([400, 403, 404]).toContain(start.status);

  await page.goto(`/app/exams/${examId}`);
  await expect(
    page.getByRole("button", { name: /^(start test|start|start mock test|start exam)$/i }),
  ).toHaveCount(0);
  await attachJsonEvidence(testInfo, evidenceName, { persistedState, detail, start });
}

async function assertStudentExamWindowBlocked(
  page: Page,
  testInfo: TestInfo,
  credentials: DirectLoginCredentials,
  examId: string,
  examTitle: string,
  expectedReasonCode: "before_window" | "after_window",
  persistedState: PersistedExamAccessState,
  evidenceName: string,
) {
  await loginWithCredentials(page, credentials, "student");
  const accessToken = await currentAccessToken(page);
  const profile = await backendJson<{ student_profile?: string | null }>(
    page,
    accessToken,
    "GET",
    "/api/v1/auth/me/",
  );
  expect(profile.ok, JSON.stringify(profile.payload)).toBe(true);
  expect(profile.payload.student_profile).toBeTruthy();

  const detail = await backendJson<{
    start_access?: {
      is_allowed?: boolean;
      reason_code?: string;
      reason_message?: string;
    };
  }>(page, accessToken, "GET", `/api/v1/student/exams/${examId}/detail/`);
  const start = await backendJson<Record<string, unknown>>(
    page,
    accessToken,
    "POST",
    "/api/v1/attempts/start/",
    { exam: examId, student: profile.payload.student_profile },
  );
  expect(detail.status, JSON.stringify(detail.payload)).toBe(200);
  expect(detail.payload.start_access?.is_allowed).toBe(false);
  expect(detail.payload.start_access?.reason_code).toBe(expectedReasonCode);
  expect(start.status, JSON.stringify(start.payload)).toBe(400);

  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /not available yet/i })).toBeDisabled();
  await expect(
    page.getByText(
      expectedReasonCode === "before_window"
        ? /window has not opened yet/i
        : /window has already closed|window has closed/i,
    ).first(),
  ).toBeVisible();
  await attachScreenshotEvidence(page, testInfo, evidenceName);
  await attachJsonEvidence(testInfo, evidenceName, { persistedState, detail, start });
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

async function createTeacherViaUi(page: Page, instituteId: string) {
  const uniqueSeed = Date.now();
  await page.goto(`/admin/people?view=teachers&institute=${instituteId}`);
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

async function createStudentViaUi(page: Page, instituteId: string) {
  const uniqueSeed = Date.now();
  let username = `pw.student.${uniqueSeed}`;
  let password = "Student@12345";

  await page.goto(`/admin/people?view=students&institute=${instituteId}`);
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
  return {
    credentials: { username, password } satisfies DirectLoginCredentials,
    studentId: payload.id!,
  };
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
  await page.getByLabel(/start at/i).fill(toDateTimeLocalValue(new Date(Date.now() - 5 * 60 * 1000)));
  await page.getByLabel(/end at/i).fill(toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
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
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`/api/institute/exams/${examId}`);
        expect(response.ok(), await response.text()).toBe(true);
        const payload = (await response.json()) as {
          status?: string;
          start_at?: string | null;
          end_at?: string | null;
          publish_readiness?: {
            ready?: boolean;
            blockers?: Array<{ code?: string; field?: string; message?: string }>;
          };
        };
        if (payload.status === "draft" && payload.publish_readiness?.blockers?.length) {
          return `draft:${payload.publish_readiness.blockers.map((blocker) => blocker.code ?? blocker.field ?? blocker.message).join(",")}`;
        }
        return payload.status ?? "missing-status";
      },
      { timeout: 60000, message: "exam should persist as scheduled or live after publishing" },
    )
    .toMatch(/^(scheduled|live)$/);
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
    test.setTimeout(600000);

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
    let unassignedStudentLogin: DirectLoginCredentials | null = null;

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
      await createTeacherViaUi(page, institute.id);
      const assignedStudent = await createStudentViaUi(page, institute.id);
      studentLogin = assignedStudent.credentials;

      await loginWithCredentials(page, instituteLogin, "institute");
      await expectInstituteWorkspace(page);
      const createdExamId = await createAndPublishExam(page, examTitle, examCode, testInfo, institute.id);
      await assignExamToVisibleStudents(page, createdExamId);

      await assertStudentExamDenied(
        page,
        testInfo,
        studentLogin,
        createdExamId,
        "draft-exam-access-denied",
      );

      await loginAsRole(page, "admin");
      const unassignedStudent = await createStudentViaUi(page, institute.id);
      unassignedStudentLogin = unassignedStudent.credentials;

      await loginWithCredentials(page, instituteLogin, "institute");
      await publishExam(page, createdExamId);

      await assertStudentExamDenied(
        page,
        testInfo,
        unassignedStudentLogin,
        createdExamId,
        "unassigned-student-access-denied",
      );

      const inactiveAssignmentState = await setSyntheticExamAccessState(
        createdExamId,
        "inactive_assignment",
      );
      expect(inactiveAssignmentState.assignments).toHaveLength(1);
      expect(inactiveAssignmentState.assignments.every((assignment) => !assignment.is_active)).toBe(true);
      await assertStudentExamDenied(
        page,
        testInfo,
        studentLogin,
        createdExamId,
        "inactive-assignment-access-denied",
        inactiveAssignmentState,
      );

      const futureWindowState = await setSyntheticExamAccessState(createdExamId, "future_window");
      expect(futureWindowState.status).toBe("scheduled");
      expect(futureWindowState.assignments.every((assignment) => assignment.is_active)).toBe(true);
      await assertStudentExamWindowBlocked(
        page,
        testInfo,
        studentLogin,
        createdExamId,
        examTitle,
        "before_window",
        futureWindowState,
        "future-window-start-blocked",
      );

      const expiredWindowState = await setSyntheticExamAccessState(createdExamId, "expired_window");
      expect(expiredWindowState.status).toBe("live");
      expect(expiredWindowState.assignments.every((assignment) => assignment.is_active)).toBe(true);
      await assertStudentExamWindowBlocked(
        page,
        testInfo,
        studentLogin,
        createdExamId,
        examTitle,
        "after_window",
        expiredWindowState,
        "expired-window-start-blocked",
      );

      const restoredLiveState = await setSyntheticExamAccessState(createdExamId, "live_window");
      expect(restoredLiveState.status).toBe("live");
      expect(restoredLiveState.assignments.every((assignment) => assignment.is_active)).toBe(true);
      await attachJsonEvidence(testInfo, "restored-live-access-state", restoredLiveState);

      await loginWithCredentials(page, studentLogin, "student");
      await page.goto(`/app/exams/${createdExamId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await attachScreenshotEvidence(page, testInfo, "student-exam-detail-before-start");
      const startButton = page.getByRole("button", { name: /^(start test|start|start mock test|start exam)$/i }).first();
      await expect(startButton).toBeVisible({ timeout: 30000 });
      const [startResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            new URL(response.url()).pathname === `/app/exams/${createdExamId}`,
        ),
        startButton.click(),
      ]);
      expect(startResponse.status()).toBe(303);
      const actionRedirect = startResponse.headers()["x-action-redirect"] ?? "";
      const attemptId = actionRedirect.match(/^\/app\/attempts\/([^;?]+)/)?.[1] ?? null;
      expect(attemptId, "Attempt id should be present in the attempt URL.").toBeTruthy();
      if (!attemptId) {
        throw new Error("Attempt id is missing after starting the exam.");
      }
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`), {
        timeout: 30000,
      });
      const studentToken = await currentAccessToken(page);
      const firstQuestionId = await page.locator('input[name="question_id"]').inputValue();
      await attachScreenshotEvidence(page, testInfo, "student-attempt-question-loaded");
      await answerImportedCorrectMcq(page, Date.now(), "Playwright full-access answer");
      await page.getByRole("button", { name: /^save & next$/i }).click();
      await expect
        .poll(async () => {
          const detail = await fetchAttemptDetail(page, studentToken, attemptId);
          const answer = detail.answers.find((item) => item.question === firstQuestionId);
          return answer?.selected_option_text ?? null;
        }, { message: "the first answer should be persisted before navigation continues" })
        .toBe("Option A");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("question"), {
          message: "Save & Next should navigate to a different persisted question",
        })
        .not.toBe(firstQuestionId);

      const recoveredAttemptUrl = page.url();
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}(?:\\?.*)?$`));
      await expect(page.getByText(/test in progress/i).first()).toBeVisible();
      await loginWithCredentials(page, studentLogin, "student");
      await page.goto(recoveredAttemptUrl);
      await expect(page.getByText(/test in progress/i).first()).toBeVisible();
      const secondQuestionId = await page.locator('input[name="question_id"]').inputValue();
      expect(secondQuestionId).not.toBe(firstQuestionId);
      await answerImportedCorrectMcq(page, Date.now(), "Playwright recovery answer");
      await page.getByRole("button", { name: /^save answer$/i }).click();
      await expect
        .poll(async () => {
          const detail = await fetchAttemptDetail(page, studentToken, attemptId);
          const answeredQuestionIds = detail.answers
            .filter((item) => item.selected_option_text === "Option A")
            .map((item) => item.question);
          return new Set(answeredQuestionIds).size;
        }, { message: "two distinct Option A answers should be persisted before submit" })
        .toBe(2);

      const preSubmitAttempt = await fetchAttemptDetail(page, studentToken, attemptId);
      await attachJsonEvidence(testInfo, "attempt-before-submit", preSubmitAttempt);
      await attachScreenshotEvidence(page, testInfo, "student-attempt-before-submit");
      page.once("dialog", async (dialog) => {
        expect(dialog.message()).toMatch(/submit this test now/i);
        await dialog.accept();
      });
      await page.getByRole("button", { name: /^end test$/i }).click();
      await expect(page).toHaveURL(new RegExp(`/app/attempts/${attemptId}/summary\\?`), { timeout: 60000 });
      await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
      const submittedAttempt = await fetchAttemptDetail(page, studentToken, attemptId);
      await attachJsonEvidence(testInfo, "attempt-after-submit", submittedAttempt);
      expect(submittedAttempt.attempted_questions).toBe(2);
      expect(submittedAttempt.correct_answers).toBe(2);
      expect(Number(submittedAttempt.final_score)).toBe(2);

      const duplicateSubmit = await backendJson<Record<string, unknown>>(
        page,
        studentToken,
        "POST",
        `/api/v1/attempts/${attemptId}/submit/`,
        { auto_submitted: false },
      );
      expect(duplicateSubmit.ok, JSON.stringify(duplicateSubmit.payload)).toBe(false);
      expect([400, 409]).toContain(duplicateSubmit.status);

      await loginWithCredentials(page, instituteLogin, "institute");
      const instituteToken = await currentAccessToken(page);
      const markCompleted = await backendJson<Record<string, unknown>>(
        page,
        instituteToken,
        "POST",
        `/api/v1/exams/${createdExamId}/mark-completed/`,
        { remarks: "Phase 1B browser certification result publish" },
      );
      expect(markCompleted.ok, JSON.stringify(markCompleted.payload)).toBe(true);
      const generateResults = await backendJson<Record<string, unknown>>(
        page,
        instituteToken,
        "POST",
        "/api/v1/results/generate-for-exam/",
        { exam: createdExamId },
      );
      expect(generateResults.ok, JSON.stringify(generateResults.payload)).toBe(true);
      const calculateRanks = await backendJson<Record<string, unknown>>(
        page,
        instituteToken,
        "POST",
        "/api/v1/results/calculate-ranks/",
        { exam: createdExamId },
      );
      expect(calculateRanks.ok, JSON.stringify(calculateRanks.payload)).toBe(true);
      const publishResults = await backendJson<Record<string, unknown>>(
        page,
        instituteToken,
        "POST",
        "/api/v1/results/publish-exam-results/",
        { exam: createdExamId },
      );
      expect(publishResults.ok, JSON.stringify(publishResults.payload)).toBe(true);
      const leaderboard = await backendJson<{ count?: number; results?: Array<Record<string, unknown>> }>(
        page,
        instituteToken,
        "GET",
        `/api/v1/results/exam/${createdExamId}/leaderboard/`,
      );
      expect(leaderboard.ok, JSON.stringify(leaderboard.payload)).toBe(true);
      expect(leaderboard.payload.count).toBe(1);

      await loginWithCredentials(page, studentLogin, "student");
      const studentResults = await backendJson<
        Array<{
          exam?: string;
          exam_title?: string;
          final_score?: string | number | null;
          percentage?: string | number | null;
          is_published?: boolean;
        }>
      >(page, await currentAccessToken(page), "GET", `/api/v1/student/results/?exam=${createdExamId}`);
      expect(studentResults.ok, JSON.stringify(studentResults.payload)).toBe(true);
      const resultRows = Array.isArray(studentResults.payload) ? studentResults.payload : [];
      const matchingResult = resultRows.find((row) => row.exam === createdExamId || row.exam_title === examTitle);
      expect(matchingResult, JSON.stringify(studentResults.payload)).toBeTruthy();
      expect(matchingResult?.is_published).toBe(true);
      expect(Number(matchingResult?.final_score ?? 0)).toBeGreaterThanOrEqual(2);
      await page.goto("/app/results?status=published");
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(page.getByText(new RegExp(escapeRegExp(examTitle), "i")).first()).toBeVisible({ timeout: 60000 });
      await attachScreenshotEvidence(page, testInfo, "student-published-result-visible");

      await loginAsRole(page, "student");
      const crossInstituteStudentToken = await currentAccessToken(page);
      const crossStudentExam = await backendJson<Record<string, unknown>>(
        page,
        crossInstituteStudentToken,
        "GET",
        `/api/v1/student/exams/${createdExamId}/detail/`,
      );
      const crossStudentAttempt = await backendJson<Record<string, unknown>>(
        page,
        crossInstituteStudentToken,
        "GET",
        `/api/v1/attempts/${attemptId}/detail/`,
      );
      const crossStudentResults = await backendJson<Array<Record<string, unknown>>>(
        page,
        crossInstituteStudentToken,
        "GET",
        `/api/v1/student/results/?exam=${createdExamId}`,
      );
      expect(crossStudentExam.status).toBe(404);
      expect(crossStudentAttempt.status).toBe(404);
      expect(crossStudentResults.ok).toBe(true);
      expect(
        crossStudentResults.payload.some(
          (result) => result.exam === createdExamId || result.attempt === attemptId,
        ),
      ).toBe(false);
      await page.goto(`/app/attempts/${attemptId}`);
      await expect(page.getByText(examTitle)).toHaveCount(0);

      await loginAsRole(page, "teacher");
      const unauthorizedTeacherExam = await backendJson<Record<string, unknown>>(
        page,
        await currentAccessToken(page),
        "GET",
        `/api/v1/exams/${createdExamId}/`,
      );
      expect(unauthorizedTeacherExam.status).toBe(404);
      await page.goto(`/teacher/exams/${createdExamId}`);
      await expect(page.getByText(examTitle)).toHaveCount(0);

      const anonymousAttemptResponse = await page.request.get(
        `${backendBaseUrl}/api/v1/attempts/${attemptId}/detail/`,
        { headers: { Authorization: "" } },
      );
      expect(anonymousAttemptResponse.status()).toBe(401);

      await attachJsonEvidence(testInfo, "phase1b-lifecycle-evidence", {
        instituteId: institute.id,
        examId: createdExamId,
        attemptId,
        duplicateSubmit: {
          status: duplicateSubmit.status,
          payload: duplicateSubmit.payload,
        },
        markCompleted: markCompleted.payload,
        generateResults: generateResults.payload,
        calculateRanks: calculateRanks.payload,
        publishResults: publishResults.payload,
        leaderboard: leaderboard.payload,
        studentResult: matchingResult,
        accessIsolation: {
          crossStudentExam,
          crossStudentAttempt,
          crossStudentResults,
          unauthorizedTeacherExam,
          anonymousAttemptStatus: anonymousAttemptResponse.status(),
        },
      });
    } finally {
      await loginAsRole(page, "admin").catch(() => null);
      await deleteDisposableInstitute(page, institute.id);
    }
  });
});
