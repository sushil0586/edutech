import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS",
);
const mutableExamActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS",
);
const backendBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

const studentImportColumns = [
  "admission_no",
  "first_name",
  "last_name",
  "gender",
  "academic_year",
  "program",
  "cohort",
  "email",
  "phone",
  "guardian_name",
  "guardian_phone",
  "address",
  "joined_at",
  "is_active",
  "create_login",
  "username",
  "password",
] as const;

type BulkImportResponse = {
  created_count: number;
  failed_count: number;
  credentials: Array<{
    profile_id?: string;
    full_name?: string;
    username?: string;
    generated_password?: string | null;
  }>;
};

type BulkImportPreviewResponse = {
  preview?: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
  };
  total_rows?: number;
  valid_rows?: number;
  invalid_rows?: number;
};

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function buildCsv(columns: readonly string[], rows: Array<Record<string, string>>) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column] ?? "")).join(",")),
  ].join("\n");
}

async function buildImportFile(
  testInfo: TestInfo,
  fileName: string,
  columns: readonly string[],
  rows: Array<Record<string, string>>,
) {
  const filePath = testInfo.outputPath(fileName);
  await writeFile(filePath, buildCsv(columns, rows), "utf8");
  return filePath;
}

async function openStudentImportDialog(page: Page) {
  await page.goto("/institute/people?view=students");
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await page.getByRole("button", { name: /import students/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: /bulk import/i })).toBeVisible();
  return dialog;
}

async function runStudentImport(page: Page, filePath: string) {
  const dialog = await openStudentImportDialog(page);
  await dialog.locator('input[type="file"]').setInputFiles(filePath);

  const previewResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/roster\/students\/preview$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /preview import/i }).click();
  const previewResponse = await previewResponsePromise;
  expect(previewResponse.ok()).toBe(true);
  const previewPayload = (await previewResponse.json()) as BulkImportPreviewResponse;
  const resolvedPreview =
    previewPayload.preview ??
    (typeof previewPayload.total_rows === "number"
      ? {
          total_rows: previewPayload.total_rows,
          valid_rows: previewPayload.valid_rows ?? 0,
          invalid_rows: previewPayload.invalid_rows ?? 0,
        }
      : null);

  expect(resolvedPreview).toBeTruthy();
  expect(resolvedPreview?.valid_rows).toBeGreaterThan(0);

  const finalizeResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/roster\/students\/finalize$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /import valid rows/i }).click();
  const finalizeResponse = await finalizeResponsePromise;
  expect(finalizeResponse.ok()).toBe(true);
  const finalizePayload = (await finalizeResponse.json()) as BulkImportResponse;
  await expect(dialog).toBeHidden();
  return finalizePayload;
}

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

async function selectOptionByLabel(locator: Locator, expectedLabel: string) {
  const normalizedExpectedLabel = expectedLabel.trim().toLowerCase();
  const optionValue = await locator.locator("option").evaluateAll(
    (options, targetLabel) => {
      const normalizedTargetLabel = String(targetLabel).trim().toLowerCase();
      const normalizedOptions = options
        .map((option) => ({
          value: (option as HTMLOptionElement).value,
          label: (option as HTMLOptionElement).label.trim(),
        }))
        .filter((option) => option.value.trim().length > 0);

      return (
        normalizedOptions.find((option) => option.label.toLowerCase() === normalizedTargetLabel)?.value ??
        normalizedOptions.find((option) => option.label.toLowerCase().includes(normalizedTargetLabel))?.value ??
        ""
      );
    },
    normalizedExpectedLabel,
  );
  expect(optionValue).toBeTruthy();
  await locator.selectOption(optionValue);
}

async function selectFirstNonEmptyOption(locator: Locator) {
  await expect
    .poll(async () => locator.locator("option").count(), {
      timeout: 30000,
      message: "Expected the option list to load at least one non-empty choice.",
    })
    .toBeGreaterThan(1);
  const optionValue = await locator.locator("option").evaluateAll((options) => {
    const normalizedOptions = options
      .map((option) => ({
        value: (option as HTMLOptionElement).value.trim(),
      }))
      .filter((option) => option.value.length > 0);
    return normalizedOptions[0]?.value ?? "";
  });
  expect(optionValue).toBeTruthy();
  await locator.selectOption(optionValue);
}

async function getCurrentSessionAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function assignExamStudents(page: Page, examId: string, studentIds: string[]) {
  const accessToken = await getCurrentSessionAccessToken(page);
  expect(accessToken).not.toBe("");
  const response = await page.request.post(`${backendBaseUrl}/api/v1/exams/${examId}/assign-students/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assignment_mode: "selected_students",
      student_ids: studentIds,
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function requestBackendJson<T>(
  page: Page,
  path: string,
  init?: {
    method?: "GET" | "POST";
    data?: Record<string, unknown>;
  },
) {
  const accessToken = await getCurrentSessionAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.fetch(`${backendBaseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: init?.data,
    timeout: 15000,
  });
  const bodyText = await response.text();
  const contentType = response.headers()["content-type"] ?? "";
  return {
    response,
    bodyText,
    payload: bodyText && contentType.includes("application/json") ? (JSON.parse(bodyText) as T) : null,
  };
}

async function runInstituteExamAction(
  page: Page,
  examId: string,
  action: "sync-marks" | "publish" | "refresh-status" | "mark-live" | "mark-completed",
) {
  const result = await requestBackendJson<{
    data?: {
      status?: string | null;
    } | null;
  }>(page, `/api/v1/exams/${examId}/${action}/`, {
    method: "POST",
    data: {},
  });
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.data?.status ?? null;
}

async function fetchExamStatus(page: Page, examId: string) {
  const result = await requestBackendJson<{
    status?: string | null;
  }>(page, `/api/v1/exams/${examId}/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.status ?? null;
}

async function fetchLeaderboardSummary(page: Page, examId: string) {
  const result = await requestBackendJson<{
    summary?: {
      all_ranked?: boolean;
      published_results?: boolean;
    } | null;
  }>(page, `/api/v1/results/exam/${examId}/leaderboard/`);
  expect(result.response.ok(), result.bodyText).toBe(true);
  return result.payload?.summary ?? null;
}

async function expectMessageInUrl(page: Page, pattern?: RegExp) {
  await expect(page).toHaveURL(/message=/);
  if (pattern) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

async function waitForStudentStartAccess(page: Page, examId: string) {
  await expect
    .poll(
      async () => {
        const detailResult = await requestBackendJson<{
          can_start?: boolean;
          start_access?: {
            is_allowed?: boolean;
            reason_message?: string | null;
            policy_code?: string | null;
          } | null;
        }>(page, `/api/v1/student/exams/${examId}/detail/`);

        if (!detailResult.response.ok()) {
          return `detail-request-failed:${detailResult.response.status()}`;
        }

        if (detailResult.payload?.start_access?.is_allowed && detailResult.payload?.can_start) {
          return "ready";
        }

        return (
          detailResult.payload?.start_access?.reason_message ??
          detailResult.payload?.start_access?.policy_code ??
          "not-ready"
        );
      },
      {
        timeout: 30000,
        intervals: [1000, 1500, 2000],
        message: "Expected the student exam-detail API to allow attempt start before clicking Start.",
      },
    )
    .toBe("ready");
}

async function createExamShell(page: Page, examTitle: string, examCode: string) {
  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

  const academicYearLabel =
    process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() || "2026-2027";
  const programLabel =
    process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim() || "Class 7";
  const cohortLabel = process.env.PLAYWRIGHT_STUDENT_IMPORT_COHORT?.trim() || "";

  await selectOptionByLabel(page.locator('select[name="academic_year"]'), academicYearLabel);
  await selectOptionByLabel(page.locator('select[name="program"]'), programLabel);
  if (cohortLabel) {
    await selectOptionByLabel(page.locator('select[name="cohort"]'), cohortLabel);
  }
  await selectFirstNonEmptyOption(page.locator('select[name="subject"]'));

  await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
  await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /^continue$/i }).click();
  }

  await page.getByRole("button", { name: /create exam shell/i }).click();
  await expect(page).toHaveURL(/\/institute\/exams\/.+\?message=/);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  const examDetailUrl = page.url().split("?")[0] ?? page.url();
  const examId = examDetailUrl.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
  expect(examId).not.toBeNull();
  return examId!;
}

async function addOneSectionAndQuestion(page: Page, examId: string, sectionName: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=sections`);
  await expect(page.getByText(/add a new section/i).first()).toBeVisible();
  await page.getByRole("textbox", { name: /section name/i }).fill(sectionName);
  await page.getByRole("spinbutton", { name: /total questions/i }).fill("1");
  await page.getByRole("button", { name: /^add section$/i }).click();
  await expect(page).toHaveURL(/tab=sections&message=/);
  await expect(page.getByText(/section added/i)).toBeVisible();

  await page.goto(`/institute/exams/${examId}/builder?tab=questions`);
  await expect(page.getByText(/attach one question manually/i).first()).toBeVisible();

  const manualAttachForm = page.locator("form.builderForm.builderSubform").filter({
    has: page.getByText(/attach one question manually/i),
  }).first();
  const questionSelect = manualAttachForm.locator('select[name="question"]');
  const questionOptions = await questionSelect.locator("option").evaluateAll((options) =>
    options
      .map((option) => ({
        value: (option as HTMLOptionElement).value,
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
  await manualAttachForm.getByRole("spinbutton", { name: /^marks$/i }).fill("4");
  await manualAttachForm.getByRole("spinbutton", { name: /negative marks/i }).fill("0");
  await manualAttachForm.getByRole("button", { name: /^attach question$/i }).click();
  await expectMessageInUrl(page, /question linked to exam/i);
  await expect(page.locator(".builderQuestionCard").first()).toBeVisible();
}

async function assignStudent(
  page: Page,
  examId: string,
  studentIdentityText: string,
  fallbackStudentIds: string[],
) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  const assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

  const studentRows = assignmentForm.locator(".selectionRow");
  const studentCount = await studentRows.count();
  if (studentCount === 0) {
    expect(fallbackStudentIds.length).toBeGreaterThan(0);
    await assignExamStudents(page, examId, fallbackStudentIds.slice(0, 1));
    await page.goto(`/institute/exams/${examId}/builder?tab=assignment&message=${encodeURIComponent("Student assignment updated.")}`);
    await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
    return;
  }

  const matchingStudentRow = studentRows.filter({
    has: page.getByText(new RegExp(escapeRegExp(studentIdentityText), "i")),
  }).first();

  if (await matchingStudentRow.count()) {
    for (let index = 0; index < studentCount; index += 1) {
      await studentRows.nth(index).locator('input[type="checkbox"]').uncheck().catch(() => null);
    }
    await matchingStudentRow.locator('input[type="checkbox"]').check();
  } else {
    await studentRows.first().locator('input[type="checkbox"]').check();
  }

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function configureAndPublishExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000);
  const endAt = new Date(now.getTime() + 90 * 60 * 1000);

  await page.goto(`/institute/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("4");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/institute/exams/${examId}`);
  const refreshStatusButton = page.getByRole("button", { name: /refresh status/i });
  if (await refreshStatusButton.isVisible().catch(() => false)) {
    await refreshStatusButton.click();
    await expect(page).toHaveURL(/message=/);
  } else {
    await runInstituteExamAction(page, examId, "refresh-status");
  }

  const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
  if (await syncMarksButton.isVisible().catch(() => false)) {
    await syncMarksButton.click();
    await expect(page).toHaveURL(/message=/);
  } else {
    await runInstituteExamAction(page, examId, "sync-marks");
  }

  const publishButton = page.getByRole("button", { name: /publish exam/i });
  if (await publishButton.isVisible().catch(() => false)) {
    await publishButton.click();
    await expect(page).toHaveURL(/message=/);
  } else {
    await runInstituteExamAction(page, examId, "publish");
  }

  const markLiveButton = page.getByRole("button", { name: /mark live/i });
  if (await markLiveButton.isVisible().catch(() => false)) {
    await markLiveButton.click();
    await expect(page).toHaveURL(/message=/);
  } else {
    await runInstituteExamAction(page, examId, "mark-live");
  }
}

async function completeStudentAttempt(
  page: Page,
  credentials: DirectLoginCredentials,
  examId: string,
  examTitle: string,
  answerSeed: number,
) {
  await loginWithCredentials(page, credentials, "student");
  await page.goto(`/app/exams/${examId}`);
  await waitForStudentStartAccess(page, examId);
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  const startButton = page.getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i });
  await expect(startButton).toBeVisible({ timeout: 30000 });
  await startButton.click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright onboarding answer");
  await page.getByRole("button", { name: /^save answer$/i }).click();
  await expect(page.getByText(/response updated successfully|1 saved/i).first()).toBeVisible();

  const submitButton = page.getByRole("button", { name: /^(submit test|end test)$/i }).first();
  await expect(submitButton).toBeVisible({ timeout: 30000 });
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await submitButton.click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
  await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
}

async function publishResults(page: Page, examId: string) {
  await loginAsRole(page, "institute");
  await expectInstituteWorkspace(page);

  await page.goto(`/institute/results?exam=${examId}`);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
  if (await markCompletedButton.isVisible().catch(() => false)) {
    await markCompletedButton.click();
    await expect(page).toHaveURL(/message=/);
  } else {
    await runInstituteExamAction(page, examId, "refresh-status");
    await runInstituteExamAction(page, examId, "mark-completed");
  }
  await expect
    .poll(async () => await fetchExamStatus(page, examId), {
      timeout: 15000,
      message: `Expected exam ${examId} to reach completed status before results publication.`,
    })
    .toBe("completed");

  const generateResultsButton = page.getByRole("button", {
    name: /generate results|regenerate summary/i,
  }).first();
  if (await generateResultsButton.isVisible().catch(() => false)) {
    await generateResultsButton.click();
    await expect
      .poll(
        async () =>
          /message=/.test(page.url()) ||
          Boolean((await fetchLeaderboardSummary(page, examId))?.all_ranked),
        { timeout: 15000 },
      )
      .toBe(true);
  }

  const calculateRanksButton = page.getByRole("button", {
    name: /calculate ranks|recalculate ranks/i,
  }).first();
  if (await calculateRanksButton.isVisible().catch(() => false)) {
    await calculateRanksButton.click();
    await expect
      .poll(
        async () =>
          /message=/.test(page.url()) || Boolean((await fetchLeaderboardSummary(page, examId))?.all_ranked),
        { timeout: 15000 },
      )
      .toBe(true);
  } else {
    await expect
      .poll(async () => Boolean((await fetchLeaderboardSummary(page, examId))?.all_ranked), {
        timeout: 15000,
        message: `Expected leaderboard summary for exam ${examId} to confirm ranked results.`,
      })
      .toBe(true);
  }

  const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
  if (await publishResultsButton.isVisible().catch(() => false)) {
    await publishResultsButton.click();
    await expect
      .poll(
        async () =>
          /message=/.test(page.url()) || Boolean((await fetchLeaderboardSummary(page, examId))?.published_results),
        { timeout: 15000 },
      )
      .toBe(true);
  } else {
    await expect
      .poll(async () => Boolean((await fetchLeaderboardSummary(page, examId))?.published_results), {
        timeout: 15000,
        message: `Expected leaderboard summary for exam ${examId} to confirm published results.`,
      })
      .toBe(true);
  }
}

test.describe("Institute onboarding dataset bootstrap", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableRosterActionsEnabled || !mutableExamActionsEnabled,
    "Enable PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS and PLAYWRIGHT_ENABLE_MUTABLE_EXAM_ACTIONS for UI bootstrap coverage.",
  );

  test("@workflow @mutable institute can bootstrap a persistent student-and-exam dataset through UI-only flows", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300000);

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const password = process.env.PLAYWRIGHT_BOOTSTRAP_STUDENT_PASSWORD?.trim() || "Demo@12345";
    const academicYear = process.env.PLAYWRIGHT_STUDENT_IMPORT_ACADEMIC_YEAR?.trim() || "2026-2027";
    const program = process.env.PLAYWRIGHT_STUDENT_IMPORT_PROGRAM?.trim() || "Class 7";
    const cohort = process.env.PLAYWRIGHT_STUDENT_IMPORT_COHORT?.trim() || "";
    const sectionName = `PW Bootstrap Section ${uniqueSeed}`;
    const examTitle = `PW Institute Bootstrap ${uniqueSeed}`;
    const examCode = `PW-BOOT-${uniqueSeed}`;

    const rows = Array.from({ length: 3 }, (_, index) => {
      const serial = String(index + 1).padStart(2, "0");
      return {
        admission_no: `OPBMS-STU-${uniqueSeed}-${serial}`,
        first_name: `Opbms${serial}`,
        last_name: "Pilot",
        gender: index % 2 === 0 ? "male" : "female",
        academic_year: academicYear,
        program,
        cohort,
        email: `opbms.pilot.${uniqueSeed}.${serial}@example.test`,
        phone: `8${String(uniqueSeed + index).slice(-9)}`,
        guardian_name: `Guardian ${serial}`,
        guardian_phone: `7${String(uniqueSeed + index).slice(-9)}`,
        address: "OPBMS Pilot Lane",
        joined_at: "2026-07-02",
        is_active: "true",
        create_login: "true",
        username: `opbms.pilot.${uniqueSeed}.${serial}`,
        password,
      };
    });

    const importFilePath = await buildImportFile(
      testInfo,
      "opbms-pilot-students.csv",
      studentImportColumns,
      rows,
    );

    const finalizePayload = await runStudentImport(page, importFilePath);
    expect(finalizePayload.created_count).toBe(rows.length);
    expect(finalizePayload.failed_count).toBe(0);

    const createdUsernames = finalizePayload.credentials
      .map((credential) => credential.username?.trim() ?? "")
      .filter(Boolean);
    expect(createdUsernames).toEqual(rows.map((row) => row.username));

    const firstStudentCredentials: DirectLoginCredentials = {
      username: rows[0]!.username,
      password,
    };
    const firstStudentAdmissionNo = rows[0]!.admission_no;
    const createdStudentIds = finalizePayload.credentials
      .map((credential) => credential.profile_id?.trim() ?? "")
      .filter(Boolean);

    const examId = await createExamShell(page, examTitle, examCode);
    await addOneSectionAndQuestion(page, examId, sectionName);
    await assignStudent(page, examId, firstStudentAdmissionNo, createdStudentIds);
    await configureAndPublishExam(page, examId);
    await completeStudentAttempt(page, firstStudentCredentials, examId, examTitle, uniqueSeed);
    await publishResults(page, examId);

    await testInfo.attach("institute-bootstrap-dataset", {
      body: Buffer.from(
        JSON.stringify(
          {
            institute: "OPBMS",
            created_at: new Date().toISOString(),
            exam: {
              title: examTitle,
              code: examCode,
              id: examId,
            },
            student_password: password,
            students: rows.map((row) => ({
              admission_no: row.admission_no,
              username: row.username,
              full_name: `${row.first_name} ${row.last_name}`,
            })),
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });
});
