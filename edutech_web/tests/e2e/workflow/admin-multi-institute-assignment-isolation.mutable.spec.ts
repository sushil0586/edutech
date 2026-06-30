import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

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
};

type StudentTarget = {
  admissionNo: string;
  displayName: string;
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

function normalizeAcademicLabel(label: string) {
  return label.replace(/\s+\([^)]+\)\s*$/, "").trim();
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
      admissionNo: `PW-MIAS-${suffix}`,
      firstName: `PWMias${laneIndex + 1}Student${index + 1}`,
      lastName: "Pilot",
      email: `pw.mias.${laneIndex + 1}.${index + 1}.${uniqueSeed}@example.test`,
      phone: `84${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
      guardianPhone: `74${String(uniqueSeed).slice(-8 + index)}`.slice(0, 10),
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
    await studentDialog.getByLabel(/create login after save/i).uncheck();

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

    const studentResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
    expect(studentResponse.ok()).toBe(true);
    const student = (await studentResponse.json()) as StudentRecord;
    students.push({
      admissionNo: definition.admissionNo,
      displayName: student.full_name?.trim() || `${definition.firstName} ${definition.lastName}`,
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

async function createAdminAdvancedMockExam(page: Page, uniqueSeed: number, lane: MultiInstituteLane) {
  const examTitle = `PW Multi Assignment Isolation ${lane.instituteName} ${uniqueSeed}`;
  const examCode = `PW-MIAS-${String(uniqueSeed).slice(-6)}-${lane.instituteId.slice(0, 4).toUpperCase()}`;

  await page.goto("/admin/exams/advanced");
  await expect(page.getByRole("heading", { name: /advanced exam builder/i }).first()).toBeVisible();

  const instituteSelect = page.getByLabel(/select template institute/i);
  await instituteSelect.selectOption(lane.instituteId);
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page).toHaveURL(new RegExp(`institute=${lane.instituteId}`));

  const fieldSelect = (label: RegExp) =>
    page
      .locator(".advancedBuilderField")
      .filter({ has: page.getByText(label) })
      .locator("select")
      .first();

  const academicYearSelect = fieldSelect(/^academic year$/i);
  const programSelect = fieldSelect(/^program$/i);
  const cohortSelect = fieldSelect(/^cohort$/i);

  const selectPreferredOption = async (select: Locator, preferredValue?: string, preferredLabel?: string) => {
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

  await selectPreferredOption(academicYearSelect, lane.academicYearId, lane.academicYearName);
  await selectPreferredOption(programSelect, lane.programId, lane.programName);

  const cohortHasRealOption = await cohortSelect.locator("option").evaluateAll((options) =>
    options.some((option) => ((option as HTMLOptionElement).value || "").trim().length > 0),
  );
  if (cohortHasRealOption) {
    await selectPreferredOption(cohortSelect, lane.cohortId, lane.cohortName);
  }

  await page.getByRole("button", { name: /quick practice/i }).click();
  await expect(page.getByText(/quick practice template applied/i)).toBeVisible();

  await page.getByRole("tab", { name: /\bbasics\b/i }).first().click();
  await page.getByLabel(/exam title/i).fill(examTitle);
  await page.getByLabel(/exam code/i).fill(examCode);
  await page.getByLabel(/exam type/i).selectOption("mock_exam");

  await page.getByRole("tab", { name: /\bcomposition\b/i }).first().click();
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
  return { examId: examId!, examTitle };
}

async function expectAssignmentIsolation(
  page: Page,
  examId: string,
  visibleStudents: StudentTarget[],
  hiddenStudents: StudentTarget[],
) {
  await page.goto(`/admin/exams/${examId}/builder?tab=assignment`);
  await expect(page.getByText(/student assignment/i).first()).toBeVisible();

  const assignmentForm = page.locator("form.builderForm").filter({
    has: page.getByRole("button", { name: /save assignment/i }),
  }).first();
  await assignmentForm.locator('select[name="assignment_mode"]').selectOption("selected_students");

  const studentCheckboxes = assignmentForm.locator('input[name="student_ids"][type="checkbox"]');
  await expect(studentCheckboxes.first()).toBeVisible();
  expect(await studentCheckboxes.count()).toBeGreaterThan(0);

  for (const student of visibleStudents) {
    await expect(
      assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(student.displayName), "i")),
      }).first(),
    ).toBeVisible();
  }

  for (const student of hiddenStudents) {
    await expect(
      assignmentForm.locator(".selectionRow").filter({
        has: page.getByText(new RegExp(escapeRegExp(student.displayName), "i")),
      }).first(),
    ).toHaveCount(0);
  }
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

test.describe("Admin multi-institute assignment isolation", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are required.",
  );

  test("@workflow @mutable admin assignment tab stays isolated per institute scope", async ({ page }) => {
    test.setTimeout(300000);

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

      expect(lanes).toHaveLength(2);

      const firstLane = lanes[0]!;
      const secondLane = lanes[1]!;

      const firstExam = await createAdminAdvancedMockExam(page, uniqueSeed, firstLane);
      examIds.push(firstExam.examId);
      await expectAssignmentIsolation(page, firstExam.examId, firstLane.students, secondLane.students);

      await loginAsRole(page, "admin");
      await expectAdminWorkspace(page);

      const secondExam = await createAdminAdvancedMockExam(page, uniqueSeed + 1, secondLane);
      examIds.push(secondExam.examId);
      await expectAssignmentIsolation(page, secondExam.examId, secondLane.students, firstLane.students);
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
