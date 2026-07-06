import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled } from "../helpers/mutable";
import { expectAdminWorkspace, expectInstituteWorkspace } from "../helpers/navigation";
import { AdminEconomyQuestionBankPage } from "../page-objects/admin/admin-economy-question-bank.po";
import { InstituteQuestionBankPage } from "../page-objects/institute/institute-question-bank.po";

const mutableAdminOnboardingTypesEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ONBOARDING_TYPES",
);
const mutableAdminEconomyActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ECONOMY_ACTIONS",
);
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

type CreatedInstitute = {
  id: string;
  name: string;
  code: string;
};

type AdminQuestionBankPackage = {
  id: string;
  code: string;
  scopes: Array<{
    program_name: string | null;
    subject_name: string | null;
  }>;
};

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

function uniqueSeed() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

async function createInstituteViaApi(page: Page, name: string, code: string): Promise<CreatedInstitute> {
  const response = await page.request.post("/api/admin/institutes", {
    data: {
      name,
      code,
      email: `${code.toLowerCase()}@example.test`,
      phone: `91${String(Date.now()).slice(-8)}`,
      website: `https://${code.toLowerCase()}.example.test`,
      description: "Disposable consolidated regression institute created by Playwright.",
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as CreatedInstitute;
}

async function deleteInstituteViaApi(page: Page, instituteId: string | null) {
  if (!instituteId) {
    return;
  }
  try {
    await page.request.delete(`/api/admin/institutes/${instituteId}`, { timeout: 5000 });
  } catch {
    // Best-effort cleanup only.
  }
}

async function getAdminAccessToken(page: Page) {
  const token =
    (await page.context().cookies()).find((cookie) => cookie.name === "nexora_access_token")?.value?.trim() ?? "";
  expect(token).toBeTruthy();
  return token;
}

async function fetchAdminQuestionBankPackages(page: Page, adminAccessToken: string) {
  const response = await page.request.get(`${backendBaseUrl}/api/v1/economy/admin/question-bank-packages/`, {
    headers: {
      Authorization: `Bearer ${adminAccessToken}`,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminQuestionBankPackage[];
}

async function ensureScholarScope(
  page: Page,
  economyPage: AdminEconomyQuestionBankPage,
  adminAccessToken: string,
  scopes: Array<{ program: RegExp; subject: RegExp }>,
) {
  const packages = await fetchAdminQuestionBankPackages(page, adminAccessToken);
  const scholarPackage = packages.find((pkg) => pkg.code === "SCHOLAR-QUESTION-BANK-ACCESS");
  expect(scholarPackage).toBeTruthy();

  const missingScopes = scopes.filter(
    (requiredScope) =>
      !scholarPackage!.scopes.some(
        (currentScope) =>
          requiredScope.program.test(currentScope.program_name || "") &&
          requiredScope.subject.test(currentScope.subject_name || ""),
      ),
  );

  if (!missingScopes.length) {
    return;
  }

  await economyPage.goto();
  await economyPage.openCatalogView();
  await economyPage.editPackage("Scholar Question Bank Access");

  for (const missingScope of missingScopes) {
    await economyPage.addScopeRow();
    const scopeRows = economyPage.scopeRows();
    const newScopeRow = scopeRows.nth((await scopeRows.count()) - 1);
    await economyPage.selectScopeProgram(newScopeRow, missingScope.program);
    await economyPage.selectScopeSubject(newScopeRow, missingScope.subject);
    await economyPage.setScopeActive(newScopeRow);
  }

  await economyPage.savePackageUpdate();
}

async function openMasterDefaults(page: Page, institute: CreatedInstitute) {
  await page.goto(`/admin/academic-setup?institute=${institute.id}&section=master-defaults`);
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`institute=${institute.id}(&|$)`));
  await expect(page.getByRole("button", { name: /apply preset/i })).toBeVisible();
}

async function setAcademicYear(page: Page, label: string, start: string, end: string) {
  await page.getByLabel(/academic year name/i).fill(label);
  await page.getByLabel(/academic year start/i).fill(start);
  await page.getByLabel(/academic year end/i).fill(end);
}

async function deselectSubject(page: Page, label: string) {
  const section = page.locator("section.contentCard").filter({
    has: page.getByText(/select subjects to apply/i).first(),
  }).first();
  const checkbox = section.getByRole("checkbox", { name: label, exact: true });
  await checkbox.click();
  await expect.poll(async () => checkbox.isChecked()).toBe(false);
}

async function applyPreset(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      /\/api\/admin\/academics\/presets\/apply$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /apply preset/i }).click();
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  await expect(page.getByText(/last apply result/i).first()).toBeVisible();
}

async function createInstituteLoginViaUi(page: Page, instituteId: string) {
  await page.goto(`/admin/institutes?institute=${instituteId}`);
  const detailCard = page.locator(".adminInstituteDetailCard").first();
  await expect(detailCard).toBeVisible();

  const accountPanel = detailCard.locator(".adminInstituteAccountPanel").first();
  await expect(accountPanel).toContainText(/credential controls/i);

  const createLoginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/admin/account-management/institutes/${instituteId}/create-login`) &&
      response.request().method() === "POST",
  );
  await accountPanel.getByRole("button", { name: /create login/i }).click();
  const createLoginResponse = await createLoginResponsePromise;
  expect(createLoginResponse.ok(), await createLoginResponse.text()).toBe(true);

  const payload = (await createLoginResponse.json()) as {
    username?: string;
    generated_password?: string;
  };
  expect(payload.username).toBeTruthy();
  expect(payload.generated_password).toBeTruthy();
  await expect(accountPanel.getByText(/created login for/i)).toBeVisible();

  return {
    username: payload.username!.trim(),
    password: payload.generated_password!.trim(),
  };
}

async function readSummaryCount(page: Page, label: RegExp) {
  const value = await page
    .locator(".builderSummaryCard")
    .filter({ hasText: label })
    .first()
    .locator("strong")
    .innerText();
  return Number(value.replace(/[^\d]/g, ""));
}

async function openLinkedQuestionBankForScope(page: Page, programLabel: RegExp, subjectLabel: RegExp) {
  const questionBank = new InstituteQuestionBankPage(page);
  await questionBank.gotoLinked();
  await questionBank.expectLinkedLoaded();
  await questionBank.selectAcademicFilters(programLabel, subjectLabel);
  await page.getByRole("button", { name: /apply filters/i }).click();
  await questionBank.expectLinkedScopeSummary();
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

async function createExamShell(page: Page, examTitle: string, examCode: string) {
  await page.goto("/institute/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();

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
  await expect(page).toHaveURL(/tab=questions&message=/);
  await expect(page.getByText(/question linked to exam/i)).toBeVisible();
}

async function assignStudent(page: Page, examId: string, studentDisplayName: string) {
  await page.goto(`/institute/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  const assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  const studentCount = await studentCheckboxes.count();
  expect(studentCount).toBeGreaterThan(0);

  const matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
    has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
  }).first();

  if (await matchingStudentRow.count()) {
    for (let index = 0; index < studentCount; index += 1) {
      await studentCheckboxes.nth(index).uncheck().catch(() => null);
    }
    await matchingStudentRow.locator('input[name="student_ids"]').check();
  } else {
    await studentCheckboxes.first().check();
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

  const syncMarksButton = page.getByRole("button", { name: /sync marks/i });
  if (await syncMarksButton.count()) {
    await syncMarksButton.click();
    await expect(page).toHaveURL(/message=/);
  }

  const publishButton = page.getByRole("button", { name: /publish exam/i });
  if (await publishButton.count()) {
    await publishButton.click();
    await expect(page).toHaveURL(/message=/);
  }

  const markLiveButton = page.getByRole("button", { name: /mark live/i });
  if (await markLiveButton.count()) {
    await markLiveButton.click();
    await expect(page).toHaveURL(/message=/);
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
  await expect(
    page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first(),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^(start|start (mock test|practice set|exam|quiz))$/i })
    .click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright consolidated answer");
  await page.getByRole("button", { name: /^save answer$/i }).click();
  await expect(page.locator("p").filter({ hasText: /response updated successfully/i }).first()).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
  await expect(page.getByText(/attempt submitted successfully/i).first()).toBeVisible();
}

async function publishResults(
  page: Page,
  instituteCredentials: DirectLoginCredentials,
  examId: string,
) {
  await loginWithCredentials(page, instituteCredentials, "institute");
  await expectInstituteWorkspace(page);

  await page.goto(`/institute/results?exam=${examId}`);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

  const markCompletedButton = page.getByRole("button", { name: /mark exam completed/i });
  if (await markCompletedButton.count()) {
    await markCompletedButton.click();
    await expect(page).toHaveURL(/message=/);
  }

  const generateResultsButton = page.getByRole("button", {
    name: /generate results|regenerate summary/i,
  }).first();
  await expect(generateResultsButton).toBeVisible();
  await generateResultsButton.click();
  await expect(page).toHaveURL(/message=/);

  const calculateRanksButton = page.getByRole("button", {
    name: /calculate ranks|recalculate ranks/i,
  }).first();
  await expect(calculateRanksButton).toBeVisible();
  await calculateRanksButton.click();
  await expect(page).toHaveURL(/message=/);

  const publishResultsButton = page.getByRole("button", { name: /publish results/i }).first();
  if (await publishResultsButton.isVisible().catch(() => false)) {
    await publishResultsButton.click();
    await expect(page).toHaveURL(/message=/);
  }
}

test.describe("Admin to institute consolidated onboarding regression", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminOnboardingTypesEnabled ||
      !mutableAdminEconomyActionsEnabled ||
      !mutableRosterActionsEnabled ||
      !mutableExamActionsEnabled,
    "Enable mutable onboarding, economy, roster, and exam flags for consolidated regression coverage.",
  );

  test("@workflow @mutable admin can onboard a fresh institute, grant content access, and drive exam-to-results end to end", async ({
    page,
  }, testInfo) => {
    test.setTimeout(420000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const adminAccessToken = await getAdminAccessToken(page);
    const economyPage = new AdminEconomyQuestionBankPage(page);
    await ensureScholarScope(page, economyPage, adminAccessToken, [
      { program: /class 7/i, subject: /math/i },
      { program: /class 7/i, subject: /science/i },
      { program: /class 8/i, subject: /math/i },
    ]);

    const seed = uniqueSeed();
    const instituteCode = `PCR${seed.slice(-5)}`;
    const instituteName = `PW Consolidated ${seed}`;
    const academicYearLabel = `2039-2040 Consolidated ${seed}`;
    const studentPassword = process.env.PLAYWRIGHT_BOOTSTRAP_STUDENT_PASSWORD?.trim() || "Demo@12345";

    let instituteId: string | null = null;

    try {
      const institute = await createInstituteViaApi(page, instituteName, instituteCode);
      instituteId = institute.id;

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, academicYearLabel, "2039-04-01", "2040-03-31");
      await page.getByLabel(/apply mode/i).selectOption("selected_subjects");
      await page.waitForTimeout(500);
      for (const label of [
        "Social Science 12 topics · CLS7-SST",
        "Computer 15 topics · CLS7-COMP",
        "General Knowledge 12 topics · CLS7-GK",
      ]) {
        await deselectSubject(page, label);
      }
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("SCHOLAR-QUESTION-BANK-ACCESS");
      await page.getByLabel(/question linking mode/i).selectOption("auto_link_selected_scope");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");
      await applyPreset(page);

      await openMasterDefaults(page, institute);
      await setAcademicYear(page, academicYearLabel, "2039-04-01", "2040-03-31");
      await page.getByLabel(/academic preset/i).selectOption("class_8_cbse_core");
      await page.getByLabel(/apply mode/i).selectOption("full");
      await page.getByLabel(/question-bank package access/i).selectOption("enabled");
      await page.getByLabel(/default question-bank package/i).selectOption("SCHOLAR-QUESTION-BANK-ACCESS");
      await page.getByLabel(/question linking mode/i).selectOption("auto_link_selected_scope");
      await page.getByLabel(/advanced builder access/i).selectOption("enabled");
      await applyPreset(page);

      const instituteCredentials = await createInstituteLoginViaUi(page, institute.id);

      await loginWithCredentials(page, instituteCredentials, "institute");
      await expectInstituteWorkspace(page);

      await openLinkedQuestionBankForScope(page, /class 7/i, /math/i);
      expect(await readSummaryCount(page, /total linked questions/i)).toBeGreaterThanOrEqual(650);

      await openLinkedQuestionBankForScope(page, /class 7/i, /science/i);
      expect(await readSummaryCount(page, /total linked questions/i)).toBeGreaterThanOrEqual(900);

      await openLinkedQuestionBankForScope(page, /class 8/i, /math/i);
      expect(await readSummaryCount(page, /total linked questions/i)).toBeGreaterThanOrEqual(200);

      const studentRows = Array.from({ length: 2 }, (_, index) => {
        const serial = String(index + 1).padStart(2, "0");
        return {
          admission_no: `${instituteCode}-STU-${serial}`,
          first_name: `Consolidated${serial}`,
          last_name: "Student",
          gender: index % 2 === 0 ? "male" : "female",
          academic_year: academicYearLabel,
          program: "Class 7",
          cohort: "",
          email: `consolidated.${seed}.${serial}@example.test`,
          phone: `8${String(Number(seed.slice(-9)) + index).padStart(9, "0").slice(-9)}`,
          guardian_name: `Guardian ${serial}`,
          guardian_phone: `7${String(Number(seed.slice(-9)) + index).padStart(9, "0").slice(-9)}`,
          address: "Playwright Consolidated Lane",
          joined_at: "2039-07-01",
          is_active: "true",
          create_login: "true",
          username: `${instituteCode.toLowerCase()}.student.${serial}`,
          password: studentPassword,
        };
      });

      const importFilePath = await buildImportFile(
        testInfo,
        "consolidated-regression-students.csv",
        studentImportColumns,
        studentRows,
      );
      const finalizePayload = await runStudentImport(page, importFilePath);
      expect(finalizePayload.created_count).toBe(studentRows.length);
      expect(finalizePayload.failed_count).toBe(0);

      const firstStudentCredentials: DirectLoginCredentials = {
        username: studentRows[0]!.username,
        password: studentPassword,
      };
      const firstStudentDisplayName = `${studentRows[0]!.first_name} ${studentRows[0]!.last_name}`;

      const examTitle = `PW Consolidated Exam ${seed}`;
      const examCode = `PW-CONS-${seed.slice(-6)}`;
      const sectionName = `PW Consolidated Section ${seed}`;

      const examId = await createExamShell(page, examTitle, examCode);
      await addOneSectionAndQuestion(page, examId, sectionName);
      await assignStudent(page, examId, firstStudentDisplayName);
      await configureAndPublishExam(page, examId);
      await completeStudentAttempt(page, firstStudentCredentials, examId, examTitle, Number(seed.slice(-6)));
      await publishResults(page, instituteCredentials, examId);

      await page.goto(`/institute/results?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /open leaderboard/i }).first()).toBeVisible();

      await page.goto(`/institute/reviews?exam=${examId}`);
      await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();

      await page.goto(`/institute/exams/${examId}`);
      await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();
      await expect(
        page
          .getByRole("article")
          .filter({ hasText: /result status/i })
          .getByText(/published/i)
          .first(),
      ).toBeVisible();

      await testInfo.attach("consolidated-regression-summary", {
        body: Buffer.from(
          JSON.stringify(
            {
              institute: {
                id: institute.id,
                code: institute.code,
                name: institute.name,
              },
              login: instituteCredentials,
              students: studentRows.map((row) => ({
                username: row.username,
                full_name: `${row.first_name} ${row.last_name}`,
              })),
              exam: {
                id: examId,
                title: examTitle,
                code: examCode,
              },
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });
    } finally {
      await deleteInstituteViaApi(page, instituteId);
    }
  });
});
