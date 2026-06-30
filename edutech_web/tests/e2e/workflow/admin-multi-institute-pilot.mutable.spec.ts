import { expect, test, type Locator, type Page } from "@playwright/test";
import { answerCurrentAttemptQuestion } from "../helpers/attempt";
import { loginAsRole, loginWithCredentials, testRequiresRole, type DirectLoginCredentials } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace, expectStudentWorkspace } from "../helpers/navigation";

const mutableAdminStudentAttemptEnabled =
  isMutableLaneEnabled("PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS");

const adminApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type InstituteRecord = {
  id: string;
  name: string;
  is_active?: boolean;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  is_active?: boolean;
  is_current?: boolean;
};

type ProgramRecord = {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
};

type CohortRecord = {
  id: string;
  name: string;
  code?: string;
  program?: string;
  academic_year?: string;
  is_active?: boolean;
};

type StudentRecord = {
  id: string;
  full_name?: string;
  admission_no?: string;
  login_username?: string | null;
};

type StudentTarget = {
  admissionNo: string;
  displayName: string;
  credentials: DirectLoginCredentials;
  studentId: string;
};

type InstituteScope = {
  instituteId: string;
  instituteName: string;
  academicYearName: string;
  programName: string;
  cohortName: string;
  academicYearId?: string;
  programId?: string;
  cohortId?: string;
};

type MultiInstituteLane = InstituteScope & {
  students: StudentTarget[];
};

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

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
}

function throttleMessageFromText(message: string) {
  return /request was throttled|expected available in\s+\d+\s+seconds?/i.test(message);
}

async function backendAccessToken(page: Page) {
  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");
  return accessToken;
}

async function fetchJson<T>(page: Page, path: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.get(`${adminApiBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  expect(response.ok()).toBe(true);
  return (await response.json()) as T;
}

function extractResults<T>(payload: { results?: T[] } | T[]) {
  return Array.isArray(payload) ? payload : (payload.results ?? []);
}

async function discoverInstituteScopes(page: Page): Promise<InstituteScope[]> {
  const institutesPayload = await fetchJson<{ results?: InstituteRecord[] } | InstituteRecord[]>(
    page,
    "/api/v1/institutes/?page_size=100",
  );
  const institutes = extractResults(institutesPayload).filter((institute) => institute.is_active !== false);

  const scopes: InstituteScope[] = [];
  for (const institute of institutes) {
    const [academicYearsPayload, programsPayload, cohortsPayload] = await Promise.all([
      fetchJson<{ results?: AcademicYearRecord[] } | AcademicYearRecord[]>(
        page,
        `/api/v1/academics/academic-years/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
      fetchJson<{ results?: ProgramRecord[] } | ProgramRecord[]>(
        page,
        `/api/v1/academics/programs/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
      fetchJson<{ results?: CohortRecord[] } | CohortRecord[]>(
        page,
        `/api/v1/academics/cohorts/?institute=${encodeURIComponent(institute.id)}&page_size=100`,
      ),
    ]);

    const academicYears = extractResults(academicYearsPayload);
    const programs = extractResults(programsPayload);
    const cohorts = extractResults(cohortsPayload);

    const academicYear =
      academicYears.find((item) => item.is_active && item.is_current) ??
      academicYears.find((item) => item.is_active) ??
      academicYears[0] ??
      null;
    const program = programs.find((item) => item.is_active) ?? programs[0] ?? null;
    if (!academicYear || !program) {
      continue;
    }

    const cohort =
      cohorts.find(
        (item) =>
          item.is_active &&
          item.program === program.id &&
          item.academic_year === academicYear.id,
      ) ??
      cohorts.find((item) => item.program === program.id) ??
      cohorts[0] ??
      null;

    scopes.push({
      instituteId: institute.id,
      instituteName: institute.name,
      academicYearId: academicYear.id,
      academicYearName: normalizeAcademicLabel(academicYear.name),
      programId: program.id,
      programName: normalizeAcademicLabel(program.code || program.name),
      cohortId: cohort?.id ?? "",
      cohortName: normalizeAcademicLabel(cohort?.code || cohort?.name || ""),
    });
  }

  return scopes.slice(0, 2);
}

async function createStudentsForInstitute(
  page: Page,
  scope: InstituteScope,
  uniqueSeed: number,
  laneIndex: number,
): Promise<MultiInstituteLane> {
  const definitions = Array.from({ length: 2 }, (_, index) => {
    const suffix = `${laneIndex + 1}${index + 1}${String(uniqueSeed).slice(-4)}`;
    return {
      admissionNo: `PW-MI-${suffix}`,
      firstName: `PWMI${laneIndex + 1}Student${index + 1}`,
      lastName: "Pilot",
      username: `pw.mi.${laneIndex + 1}.${index + 1}.${uniqueSeed}`,
      password: "Student@12345",
      email: `pw.mi.${laneIndex + 1}.${index + 1}.${uniqueSeed}@example.test`,
      phone: `83${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
      guardianPhone: `73${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
    };
  });

  await page.goto(`/admin/people?view=students&institute=${encodeURIComponent(scope.instituteId)}`);
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /select institute/i })).toHaveValue(scope.instituteId);

  const students: StudentTarget[] = [];
  let selectedAcademicYearLabel = scope.academicYearName;
  let selectedProgramLabel = scope.programName;
  let selectedCohortLabel = scope.cohortName;
  let selectedAcademicYearId = scope.academicYearId ?? "";
  let selectedProgramId = scope.programId ?? "";
  let selectedCohortId = scope.cohortId ?? "";
  for (const definition of definitions) {
    await page.getByRole("button", { name: /^create student$/i }).click();
    const studentDialog = page.getByRole("dialog");
    await expect(studentDialog.getByRole("heading", { name: /new student profile/i })).toBeVisible();
    await studentDialog.getByLabel(/admission no/i).fill(definition.admissionNo);
    await studentDialog.getByLabel(/first name/i).fill(definition.firstName);
    await studentDialog.getByLabel(/last name/i).fill(definition.lastName);
    await studentDialog.getByLabel(/^email$/i).fill(definition.email);
    await studentDialog.getByLabel(/^phone$/i).fill(definition.phone);
    await studentDialog.getByLabel(/guardian name/i).fill("Playwright Guardian");
    await studentDialog.getByLabel(/guardian phone/i).fill(definition.guardianPhone);

    const firstNonEmptyOptionValue = (values: string[]) =>
      values.find((value) => value.trim().length > 0) ?? null;

    const availableAcademicYearValues = await studentDialog
      .getByLabel(/academic year/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    const availableProgramValues = await studentDialog
      .getByLabel(/program/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));

    const academicYearValue =
      (scope.academicYearId && availableAcademicYearValues.includes(scope.academicYearId)
        ? scope.academicYearId
        : null) ?? firstNonEmptyOptionValue(availableAcademicYearValues);
    const programValue =
      (scope.programId && availableProgramValues.includes(scope.programId)
        ? scope.programId
        : null) ?? firstNonEmptyOptionValue(availableProgramValues);
    expect(academicYearValue).not.toBeNull();
    expect(programValue).not.toBeNull();

    await studentDialog.getByLabel(/academic year/i).selectOption(academicYearValue!);
    await studentDialog.getByLabel(/program/i).selectOption(programValue!);
    selectedAcademicYearId = academicYearValue!;
    selectedProgramId = programValue!;
    selectedAcademicYearLabel = normalizeAcademicLabel(
      await studentDialog.getByLabel(/academic year/i).locator("option:checked").textContent() ?? scope.academicYearName,
    );
    selectedProgramLabel = normalizeAcademicLabel(
      await studentDialog.getByLabel(/program/i).locator("option:checked").textContent() ?? scope.programName,
    );
    await studentDialog.getByLabel(/create login after save/i).uncheck();

    const availableCohortValues = await studentDialog
      .getByLabel(/cohort/i)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
    const cohortValue =
      (scope.cohortId && availableCohortValues.includes(scope.cohortId) ? scope.cohortId : null) ??
      firstNonEmptyOptionValue(availableCohortValues);
    if (cohortValue) {
      await studentDialog.getByLabel(/cohort/i).selectOption(cohortValue);
      selectedCohortId = cohortValue;
      selectedCohortLabel = normalizeAcademicLabel(
        await studentDialog.getByLabel(/cohort/i).locator("option:checked").textContent() ?? scope.cohortName,
      );
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/people/students") &&
        response.request().method() === "POST",
    );
    await studentDialog.getByRole("button", { name: /^create student$/i }).last().click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    const createPayload = (await createResponse.json()) as { id?: string };
    const studentId = createPayload.id ?? "";
    expect(studentId).not.toBe("");

    const createLoginResponse = await page.request.post(`/api/admin/account-management/students/${studentId}/create-login`, {
      data: {
        username: definition.username,
        password: definition.password,
        confirm_password: definition.password,
        auto_generate: false,
      },
    });
    if (!createLoginResponse.ok()) {
      const loginProvisionMessage = (await createLoginResponse.text().catch(() => "")).trim();
      if (createLoginResponse.status() === 429 || throttleMessageFromText(loginProvisionMessage)) {
        test.skip(
          true,
          "Admin student login provisioning is currently throttled by the backend cooldown window.",
        );
      }
    }
    expect(createLoginResponse.ok()).toBe(true);

    const studentResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
    expect(studentResponse.ok()).toBe(true);
    const student = (await studentResponse.json()) as StudentRecord;
    students.push({
      admissionNo: definition.admissionNo,
      displayName: student.full_name?.trim() || `${definition.firstName} ${definition.lastName}`,
      credentials: {
        username: definition.username,
        password: definition.password,
      },
      studentId,
    });
  }

  return {
    ...scope,
    academicYearName: selectedAcademicYearLabel,
    programName: selectedProgramLabel,
    cohortName: selectedCohortLabel,
    academicYearId: selectedAcademicYearId,
    programId: selectedProgramId,
    cohortId: selectedCohortId,
    students,
  };
}

async function openStage(page: Page, name: RegExp) {
  await page.getByRole("tab", { name }).first().click();
}

async function createAdminAdvancedMockExam(
  page: Page,
  uniqueSeed: number,
  lane: MultiInstituteLane,
) {
  const examTitle = `PW Multi Institute ${lane.instituteName} ${uniqueSeed}`;
  const examCode = `PW-MI-${String(uniqueSeed).slice(-6)}-${lane.instituteId.slice(0, 4).toUpperCase()}`;

  await page.goto("/admin/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  const instituteSelect = page.getByLabel(/select template institute/i);
  const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
    options.map((option) => ({
      label: (option as HTMLOptionElement).label.trim(),
      value: (option as HTMLOptionElement).value.trim(),
    })),
  );
  const matchedInstituteOption =
    instituteOptions.find((option) => option.value === lane.instituteId) ??
    instituteOptions.find((option) => option.label.toLowerCase().includes(lane.instituteName.toLowerCase())) ??
    null;
  expect(matchedInstituteOption).not.toBeNull();

  await instituteSelect.selectOption(matchedInstituteOption!.value);
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page).toHaveURL(new RegExp(`institute=${matchedInstituteOption!.value}`));

  const fieldSelect = (label: RegExp) =>
    page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(label) })
      .locator("select")
      .first();

  const academicYearSelect = fieldSelect(/^academic year$/i);
  const programSelect = fieldSelect(/^program$/i);
  const cohortSelect = fieldSelect(/^cohort$/i);

  const selectBestOption = async (
    select: Locator,
    preferredValue?: string,
    preferredLabel?: string,
  ) => {
    const option = await select.locator("option").evaluateAll(
      (options, preferred) => {
        const mapped = options.map((option) => ({
          value: (option as HTMLOptionElement).value.trim(),
          label: ((option as HTMLOptionElement).label || option.textContent || "").trim(),
        }));
        return (
          mapped.find((option) => option.value.length > 0 && preferred?.value && option.value === preferred.value) ??
          mapped.find(
            (option) =>
              option.value.length > 0 &&
              preferred?.label &&
              option.label.toLowerCase().includes(preferred.label.toLowerCase()),
          ) ??
          mapped.find((option) => option.value.length > 0) ??
          null
        );
      },
      { value: preferredValue ?? "", label: preferredLabel ?? "" },
    );
    expect(option).not.toBeNull();
    await select.selectOption(option!.value);
  };

  await selectBestOption(academicYearSelect, lane.academicYearId, lane.academicYearName);
  await selectBestOption(programSelect, lane.programId, lane.programName);

  const cohortHasRealOption = await cohortSelect.locator("option").evaluateAll((options) =>
    options.some((option) => ((option as HTMLOptionElement).value || "").trim().length > 0),
  );
  if (cohortHasRealOption) {
    await selectBestOption(cohortSelect, lane.cohortId, lane.cohortName);
  }

  await page.getByRole("button", { name: /quick practice/i }).click();
  await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

  await openStage(page, /\bbasics\b/i);
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption("mock_exam");

  await openStage(page, /\bcomposition\b/i);
  await page.getByLabel(/selection mode/i).selectOption("subject_fallback");
  const firstSectionCard = page.locator(".advancedBuilderSectionCard").first();
  await firstSectionCard.getByLabel(/question count/i).fill("1");
  const topicRows = firstSectionCard.locator(".advancedBuilderTopicRow");
  for (let index = await topicRows.count() - 1; index >= 1; index -= 1) {
    await topicRows.nth(index).getByRole("button", { name: /^remove$/i }).click();
  }
  await firstSectionCard.locator(".advancedBuilderTopicRow").first().locator('input[type="number"]').fill("1");

  await page.getByRole("button", { name: /preview exam/i }).click();
  await expect(page.getByText(/preview refreshed\./i)).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: /create advanced exam/i }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/.+\/builder\?message=/, { timeout: 60000 });
  await expect(page.getByText(/advanced exam created successfully\./i)).toBeVisible();

  const examId = page.url().match(/\/admin\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
  expect(examId).not.toBeNull();

  return {
    examId: examId!,
    examTitle,
  };
}

async function assignStudentToAdminExam(page: Page, examId: string, studentDisplayName: string) {
  let assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  let matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
    has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
  }).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`/admin/exams/${examId}/builder?tab=assignment`);
    await expect(page.getByText(/student assignment/i).first()).toBeVisible();
    assignmentForm = page.locator("form.builderForm").filter({
      has: page.getByRole("button", { name: /save assignment/i }),
    }).first();
    await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");
    matchingStudentRow = assignmentForm.locator(".selectionRow").filter({
      has: page.getByText(new RegExp(escapeRegExp(studentDisplayName), "i")),
    }).first();
    if ((await matchingStudentRow.count()) > 0) {
      break;
    }
    await page.waitForTimeout(2000);
  }

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  const studentCount = await studentCheckboxes.count();
  expect(studentCount).toBeGreaterThan(0);
  expect(await matchingStudentRow.count()).toBeGreaterThan(0);

  for (let index = 0; index < studentCount; index += 1) {
    await studentCheckboxes.nth(index).uncheck().catch(() => null);
  }
  await matchingStudentRow.locator('input[name="student_ids"]').check();

  await assignmentForm.getByRole("button", { name: /save assignment/i }).click();
  await expect(page).toHaveURL(/tab=assignment&message=/);
  await expect(page.getByText(/student assignment updated\./i)).toBeVisible();
}

async function scheduleAndPublishAdminExam(page: Page, examId: string) {
  const now = new Date();
  const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const endAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await page.goto(`/admin/exams/${examId}/builder`);
  await page.locator('input[name="start_at"]').fill(toDateTimeLocalValue(startAt));
  await page.locator('input[name="end_at"]').fill(toDateTimeLocalValue(endAt));
  await page.locator('input[name="total_marks"]').fill("1");
  await page.locator('input[name="passing_marks"]').fill("1");
  await page.getByRole("button", { name: /save exam settings/i }).click();
  await expect(page).toHaveURL(/message=/);
  await expect(page.getByText(/exam settings updated\./i)).toBeVisible();

  await page.goto(`/admin/exams/${examId}`);
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

async function attemptExamAsStudent(
  page: Page,
  examId: string,
  examTitle: string,
  credentials: DirectLoginCredentials,
  answerSeed: number,
) {
  await loginWithCredentials(page, credentials, "student");
  await expectStudentWorkspace(page);

  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: new RegExp(escapeRegExp(examTitle), "i") }).first()).toBeVisible();

  const startButton = page.getByRole("button", { name: /^(start|start mock test|start exam|start practice set)$/i });
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+(?:\?.*)?$/);
  await expect(page.getByText(/test in progress|attempt locked/i).first()).toBeVisible();

  await answerCurrentAttemptQuestion(page, answerSeed, "Playwright multi institute answer");
  await page.getByRole("button", { name: /save answer|save (&|and) review|save (&|and) next/i }).first().click();
  await expect(
    page
      .locator(".feedbackBannerSuccess")
      .filter({ hasText: /response updated successfully|answer saved/i })
      .first(),
  ).toBeVisible();

  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: /^submit test$/i }).click();
  await expect(page).toHaveURL(/\/app\/attempts\/[^/?#]+\/summary\?/);
  await expect(page.getByRole("heading", { name: /summary/i }).first()).toBeVisible();
  await expect(page.getByText(/attempt submitted successfully/i)).toBeVisible();
}

async function verifyExamBlockedForUnassignedStudent(
  page: Page,
  examId: string,
  credentials: DirectLoginCredentials,
) {
  await loginWithCredentials(page, credentials, "student");
  await expectStudentWorkspace(page);
  await page.goto(`/app/exams/${examId}`);
  await expect(page.getByRole("heading", { name: /exam detail/i }).first()).toBeVisible();
  await expect(
    page
      .getByText(/not available to this student|unable to load exam detail/i)
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", {
        name: /this exam is not available in your workspace|exam detail could not be loaded/i,
      })
      .first(),
  ).toBeVisible();
}

async function deleteAdminExamDirectly(page: Page, examId: string) {
  const accessToken = await backendAccessToken(page);
  const response = await page.request.delete(`${adminApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
}

test.describe("Admin multi-institute pilot workflow", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are required.",
  );

  test.skip(
    !mutableAdminStudentAttemptEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_STUDENT_ATTEMPT_ACTIONS",
      "multi-institute disposable pilot coverage",
    ),
  );

  test("@workflow @mutable admin can create multi-institute student pilot data and prove exam runtime across separate tenants", async ({
    page,
  }) => {
    test.setTimeout(420000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const scopes = await discoverInstituteScopes(page);
    expect(scopes.length).toBeGreaterThanOrEqual(2);

    const uniqueSeed = Date.now();
    const lanes: MultiInstituteLane[] = [];
    const examIds: string[] = [];

    try {
      for (const [index, scope] of scopes.entries()) {
        const lane = await createStudentsForInstitute(page, scope, uniqueSeed, index);
        lanes.push(lane);
      }

      for (const [index, lane] of lanes.entries()) {
        await loginAsRole(page, "admin");
        await expectAdminWorkspace(page);

        const created = await createAdminAdvancedMockExam(page, uniqueSeed + index, lane);
        examIds.push(created.examId);

        await assignStudentToAdminExam(page, created.examId, lane.students[0]!.displayName);
        await scheduleAndPublishAdminExam(page, created.examId);

        await attemptExamAsStudent(
          page,
          created.examId,
          created.examTitle,
          lane.students[0]!.credentials,
          uniqueSeed + index,
        );
        await verifyExamBlockedForUnassignedStudent(
          page,
          created.examId,
          lane.students[1]!.credentials,
        );
      }
    } finally {
      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      for (const examId of examIds) {
        await deleteAdminExamDirectly(page, examId);
      }
      for (const lane of lanes) {
        for (const student of lane.students) {
          const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${student.studentId}`);
          expect(deleteStudentResponse.ok()).toBe(true);
        }
      }
    }
  });
});
