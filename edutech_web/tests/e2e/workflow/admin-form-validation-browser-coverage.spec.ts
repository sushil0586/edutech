import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

type InstituteCreatePayload = {
  id?: string;
};

type TeacherCreatePayload = {
  id?: string;
};

type StudentCreatePayload = {
  id?: string;
};

type AcademicYearRecord = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type EconomyPolicyConfig = {
  institute_admin_can_confirm_orders: boolean;
  institute_admin_max_confirm_order_amount: string;
  institute_admin_can_grant_stars: boolean;
  institute_admin_max_grant_stars: number;
};

type QuestionBankPackageCreatePayload = {
  data?: {
    id?: string;
  };
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function gotoInstitutes(page: Page) {
  await page.goto("/admin/institutes");
  await expect(page.getByRole("heading", { name: /institutes/i }).first()).toBeVisible();
}

async function gotoAcademicYears(page: Page) {
  await page.goto("/admin/academic-setup?section=academic-years");
  await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
}

async function gotoSettings(page: Page) {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
}

async function academicDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

function fieldContainer(dialog: Locator, label: RegExp) {
  return dialog.locator("label").filter({ hasText: label }).first();
}

async function fillWrappedField(dialog: Locator, label: RegExp, value: string) {
  await fieldContainer(dialog, label).locator("input, textarea").first().fill(value);
}

async function selectedInstituteId(page: Page) {
  const select = page.getByLabel(/select institute/i);
  await expect(select).toBeVisible();
  return select.inputValue();
}

async function fetchAcademicYears(page: Page, instituteId: string) {
  const response = await page.request.get(
    `/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=200`,
  );
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { results?: AcademicYearRecord[] } | AcademicYearRecord[];
  return Array.isArray(body) ? body : (body.results ?? []);
}

async function fetchPolicyConfig(page: Page) {
  const response = await page.request.get("/api/admin/economy/policy-config");
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as EconomyPolicyConfig;
}

async function selectFirstNonEmptyOption(select: Locator) {
  const optionValue = await select.locator("option").evaluateAll((options) => {
    return (
      options
        .map((option) => (option as HTMLOptionElement).value)
        .find((value) => value.trim().length > 0) ?? ""
    );
  });
  expect(optionValue).toBeTruthy();
  await select.selectOption(optionValue);
  return optionValue;
}

async function createQuestionBankPackageSeed(
  page: Page,
  {
    instituteId,
    subjectId,
    packageName,
    packageCode,
  }: {
    instituteId: string;
    subjectId: string;
    packageName: string;
    packageCode: string;
  },
) {
  const response = await page.request.post("/api/admin/economy/question-bank-packages", {
    data: {
      institute: instituteId,
      name: packageName,
      code: packageCode,
      description: "Playwright seed package for duplicate-code browser validation coverage.",
      package_type: "subject_library",
      ownership_type: "institute",
      access_mode: "link_on_demand",
      is_public_catalog: true,
      sort_order: 25,
      metadata: {
        source: "playwright-admin-form-validation",
      },
      is_active: true,
      scopes: [
        {
          program: null,
          subject: subjectId,
          topic: null,
          question_source_type: "platform_only",
          difficulty_level: "",
          question_type: "",
          master_visibility: "",
          max_questions_total: null,
          max_questions_per_topic: null,
          metadata: {
            source: "playwright-admin-form-validation",
          },
          is_active: true,
        },
      ],
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as QuestionBankPackageCreatePayload;
}

test.describe("Admin form validation browser coverage", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test("@workflow admin institute form keeps required-field and duplicate-code validation truthful", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const duplicateName = `PW Validation Source ${uniqueSeed}`;
    const duplicateCode = `PWV${String(uniqueSeed).slice(-5)}`;
    let seededInstituteId: string | null = null;

    try {
      const seededInstituteResponse = await page.request.post("/api/admin/institutes", {
        data: {
          name: duplicateName,
          code: duplicateCode,
          email: `pw.validation.${uniqueSeed}@example.test`,
          phone: `91001${String(uniqueSeed).slice(-5)}`,
          country: "India",
          state: "Delhi",
          city: "Delhi",
          pincode: "110001",
        },
      });
      expect(seededInstituteResponse.ok(), await seededInstituteResponse.text()).toBe(true);
      const seededPayload = (await seededInstituteResponse.json()) as InstituteCreatePayload;
      seededInstituteId = seededPayload.id ?? null;
      expect(seededInstituteId).toBeTruthy();

      await gotoInstitutes(page);

      await page.getByRole("button", { name: /add institute/i }).click();
      const createDialog = page.getByRole("dialog");
      await expect(createDialog.getByRole("heading", { name: /add institute/i })).toBeVisible();

      await createDialog.getByRole("button", { name: /save institute/i }).click();
      await expect(createDialog.getByText(/fill the required fields to continue\./i)).toBeVisible();
      await expect(createDialog.getByText(/institute name is required\./i)).toBeVisible();
      await expect(createDialog.getByText(/institute code is required\./i)).toBeVisible();
      await expect(createDialog.getByLabel(/institute name/i)).toHaveAttribute("aria-invalid", "true");
      await expect(createDialog.getByRole("textbox", { name: /code/i })).toHaveAttribute("aria-invalid", "true");

      await createDialog.getByLabel(/institute name/i).fill(`${duplicateName} Clone`);
      await createDialog.getByRole("textbox", { name: /code/i }).fill(duplicateCode);
      await createDialog.getByRole("combobox", { name: /^country$/i }).selectOption("India");
      await createDialog.getByRole("combobox", { name: /^state$/i }).selectOption("Delhi");
      await createDialog.getByRole("combobox", { name: /^city$/i }).selectOption({ label: "Delhi" });
      const pincodeSelect = createDialog.getByRole("combobox", { name: /^pincode$/i });
      const pincodeValue =
        (await pincodeSelect.locator("option").evaluateAll((options) => {
          return (
            options
              .map((option) => (option as HTMLOptionElement).value)
              .find((value) => value.trim().length > 0) ?? ""
          );
        })) || "110001";
      if (pincodeValue) {
        await pincodeSelect.selectOption(pincodeValue);
      }

      const duplicateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/institutes") &&
          response.request().method() === "POST",
      );
      await createDialog.getByRole("button", { name: /save institute/i }).click();
      const duplicateResponse = await duplicateResponsePromise;
      expect(duplicateResponse.ok(), await duplicateResponse.text()).toBe(false);
      await expect(createDialog).toBeVisible();
      await expect(
        createDialog.getByText(/already exists|must be unique|review the highlighted fields/i).first(),
      ).toBeVisible();
      await expect(createDialog.getByRole("textbox", { name: /code/i })).toHaveAttribute("aria-invalid", "true");
    } finally {
      if (seededInstituteId) {
        const deleteResponse = await page.request.delete(`/api/admin/institutes/${seededInstituteId}`);
        expect(deleteResponse.ok(), await deleteResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow admin academic year create keeps overlap validation truthful in the browser", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoAcademicYears(page);
    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const academicYears = await fetchAcademicYears(page, instituteId);
    expect(academicYears.length).toBeGreaterThan(0);
    const referenceYear = academicYears[0]!;
    const overlappingName = `${referenceYear.name} Overlap ${Date.now()}`;

    await page.getByRole("button", { name: /^add$/i }).click();
    const dialog = await academicDialog(page);
    await fillWrappedField(dialog, /year name/i, overlappingName);
    await fillWrappedField(dialog, /start date/i, referenceYear.start_date);
    await fillWrappedField(dialog, /end date/i, referenceYear.end_date);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/academics/academic-years") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: /create record/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), await createResponse.text()).toBe(false);

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/record could not be saved\. review the highlighted fields\./i)).toBeVisible();
    await expect(
      page.getByRole("row", { name: new RegExp(escapeRegExp(overlappingName), "i") }),
    ).toHaveCount(0);
  });

  test("@workflow admin settings policy form rejects invalid numeric limits safely", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const originalConfig = await fetchPolicyConfig(page);

    await gotoSettings(page);

    const maxStarsInput = page.locator("label").filter({ hasText: /max stars per grant/i }).locator("input");
    const maxOrderAmountInput = page.locator("label").filter({ hasText: /max order amount/i }).locator("input");

    await maxStarsInput.fill("0");
    await maxOrderAmountInput.fill("0");

    const invalidSaveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/economy/policy-config") &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: /save economy policy/i }).click();
    const invalidSaveResponse = await invalidSaveResponsePromise;
    expect(invalidSaveResponse.ok(), await invalidSaveResponse.text()).toBe(false);

    await expect(page.getByText(/greater than zero|unable to save economy policy|policy save failed/i).first()).toBeVisible();
    await expect(page.getByText(/economy operator policy updated successfully/i)).toHaveCount(0);

    const latestConfig = await fetchPolicyConfig(page);
    expect(latestConfig.institute_admin_max_grant_stars).toBe(originalConfig.institute_admin_max_grant_stars);
    expect(latestConfig.institute_admin_max_confirm_order_amount).toBe(
      originalConfig.institute_admin_max_confirm_order_amount,
    );
  });

  test("@workflow admin package editor keeps backend duplicate-code rejection visible", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await gotoWithRuntimeRecovery(page, "/admin/economy?tab=question-bank&focus=packages");
    await expect(
      page.getByRole("heading", { name: /create and edit question-bank packages and scope coverage/i }),
    ).toBeVisible();
    const workspaceView = page.getByLabel(/question bank package workspace view/i);
    await expect(workspaceView).toBeVisible();
    await workspaceView.selectOption("editor");
    await expect(page.getByText(/package identity/i).first()).toBeVisible();

    const instituteSelect = page.locator(".economyPackageFormGridPrimary select").first();
    const instituteOptions = await instituteSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );
    const instituteId = instituteOptions.find((option) => option.value && option.value !== "all")?.value ?? "";
    if (!instituteId) {
      test.skip(true, "No concrete institute option is available for question-bank package validation coverage.");
    }
    await instituteSelect.selectOption(instituteId);
    expect(instituteId).toBeTruthy();

    const firstScopeRow = page.locator(".economyPackageScopeCard").first();
    await expect(firstScopeRow).toBeVisible();
    const subjectId = await selectFirstNonEmptyOption(firstScopeRow.getByLabel(/subject 1/i));

    const uniqueSeed = Date.now();
    const duplicateCode = `PW-PKG-DUP-${String(uniqueSeed).slice(-6)}`;
    const seededPackage = await createQuestionBankPackageSeed(page, {
      instituteId,
      subjectId,
      packageName: `PW Seed Package ${uniqueSeed}`,
      packageCode: duplicateCode,
    });
    const seededPackageId = seededPackage.data?.id ?? null;
    expect(seededPackageId).toBeTruthy();

    try {
      const packageIdentityInputs = page.locator(".economyPackageFormGridPrimary input");
      await packageIdentityInputs.nth(0).fill(`PW Browser Duplicate Package ${uniqueSeed}`);
      await packageIdentityInputs.nth(1).fill(duplicateCode);
      await page.getByLabel(/description/i).fill(
        "Browser coverage package that should fail on duplicate code at save time.",
      );

      const saveButton = page.getByRole("button", { name: /create question-bank package/i });
      await expect(saveButton).toBeEnabled();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/economy/question-bank-packages") &&
          response.request().method() === "POST",
      );
      await saveButton.click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(false);

      await expect(page.getByText(/package identity/i).first()).toBeVisible();
      await expect(
        page.getByText(/package could not be saved|already exists|must be unique|one or more fields are invalid/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/question bank package created successfully\./i)).toHaveCount(0);
      await expect(packageIdentityInputs.nth(1)).toHaveValue(duplicateCode);
    } finally {
      if (seededPackageId) {
        const deactivateResponse = await page.request.patch(`/api/admin/economy/question-bank-packages/${seededPackageId}`, {
          data: {
            is_active: false,
          },
        });
        expect(deactivateResponse.ok(), await deactivateResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow admin people teacher create blocks duplicate employee code safely", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteId = "a0fcb56e-672f-460f-b513-d761d7b15899";
    const teacherCode = `PW-DUP-T-${uniqueSeed}`;
    let seededTeacherId: string | null = null;

    try {
      const seededTeacherResponse = await page.request.post("/api/admin/people/teachers", {
        data: {
          institute: instituteId,
          employee_code: teacherCode,
          first_name: `DupTeacher${uniqueSeed}`,
          last_name: "Seed",
          email: `pw.dup.teacher.${uniqueSeed}@example.test`,
          phone: `92000${String(uniqueSeed).slice(-5)}`,
          is_active: true,
        },
      });
      expect(seededTeacherResponse.ok(), await seededTeacherResponse.text()).toBe(true);
      const seededPayload = (await seededTeacherResponse.json()) as TeacherCreatePayload;
      seededTeacherId = seededPayload.id ?? null;
      expect(seededTeacherId).toBeTruthy();

      await page.goto(`/admin/people?view=teachers&institute=${instituteId}`);
      await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
      await page.getByRole("button", { name: /^create teacher$/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /new teacher profile/i })).toBeVisible();

      await dialog.getByLabel(/employee code/i).fill(teacherCode);
      await dialog.getByLabel(/first name/i).fill(`Duplicate${uniqueSeed}`);
      await dialog.getByLabel(/create login after save/i).uncheck();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/teachers") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /^create teacher$/i }).last().click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(false);

      await expect(dialog).toBeVisible();
      await expect(page.getByText(/teacher could not be created\. review the highlighted fields\./i)).toBeVisible();
    } finally {
      if (seededTeacherId) {
        const deleteTeacherResponse = await page.request.delete(`/api/admin/people/teachers/${seededTeacherId}`);
        expect(deleteTeacherResponse.ok(), await deleteTeacherResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow admin people student create blocks duplicate admission number safely", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const instituteId = "a0fcb56e-672f-460f-b513-d761d7b15899";
    const admissionNo = `PW-DUP-S-${uniqueSeed}`;
    let seededStudentId: string | null = null;

    try {
      const academicYearsResponse = await page.request.get(
        `/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=20`,
      );
      expect(academicYearsResponse.ok(), await academicYearsResponse.text()).toBe(true);
      const academicYearsBody = (await academicYearsResponse.json()) as { results?: Array<{ id: string }> } | Array<{ id: string }>;
      const academicYears = Array.isArray(academicYearsBody) ? academicYearsBody : (academicYearsBody.results ?? []);
      expect(academicYears.length).toBeGreaterThan(0);
      const academicYearId = academicYears[0]!.id;

      const programsResponse = await page.request.get(
        `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=20`,
      );
      expect(programsResponse.ok(), await programsResponse.text()).toBe(true);
      const programsBody = (await programsResponse.json()) as { results?: Array<{ id: string }> } | Array<{ id: string }>;
      const programs = Array.isArray(programsBody) ? programsBody : (programsBody.results ?? []);
      expect(programs.length).toBeGreaterThan(0);
      const programId = programs[0]!.id;

      const seededStudentResponse = await page.request.post("/api/admin/people/students", {
        data: {
          institute: instituteId,
          academic_year: academicYearId,
          program: programId,
          admission_no: admissionNo,
          first_name: `DupStudent${uniqueSeed}`,
          last_name: "Seed",
          gender: "prefer_not_to_say",
          email: `pw.dup.student.${uniqueSeed}@example.test`,
          phone: `93000${String(uniqueSeed).slice(-5)}`,
          is_active: true,
        },
      });
      expect(seededStudentResponse.ok(), await seededStudentResponse.text()).toBe(true);
      const seededPayload = (await seededStudentResponse.json()) as StudentCreatePayload;
      seededStudentId = seededPayload.id ?? null;
      expect(seededStudentId).toBeTruthy();

      await page.goto(`/admin/people?view=students&institute=${instituteId}`);
      await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
      await page.getByRole("button", { name: /^create student$/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /new student profile/i })).toBeVisible();

      await dialog.getByLabel(/admission no/i).fill(admissionNo);
      await dialog.getByLabel(/first name/i).fill(`Duplicate${uniqueSeed}`);
      await selectFirstNonEmptyOption(dialog.getByLabel(/academic year/i));
      await selectFirstNonEmptyOption(dialog.getByLabel(/program/i));
      await dialog.getByLabel(/create login after save/i).uncheck();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/students") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /^create student$/i }).last().click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(false);

      await expect(dialog).toBeVisible();
      await expect(page.getByText(/student could not be created\. review the highlighted fields\./i)).toBeVisible();
    } finally {
      if (seededStudentId) {
        const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${seededStudentId}`);
        expect(deleteStudentResponse.ok(), await deleteStudentResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow admin people teacher edit blocks duplicate employee code safely", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const instituteId = "a0fcb56e-672f-460f-b513-d761d7b15899";
    await page.goto(`/admin/people?view=teachers&institute=${instituteId}`);
    await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();

    const rows = page.locator(".adminPeopleRosterTable tbody tr");
    await expect(rows).toHaveCount(8);
    const sourceRow = rows.nth(0);
    const duplicateRow = rows.nth(1);
    await expect(sourceRow).toBeVisible();
    await expect(duplicateRow).toBeVisible();

    const sourceEditButton = sourceRow.getByRole("button", { name: /^edit$/i });
    const sourceRowText = await sourceRow.textContent();
    expect(sourceRowText).toBeTruthy();

    const duplicateEmployeeCode =
      ((await duplicateRow.locator("td").nth(1).locator("strong").textContent()) ?? "").trim();
    expect(duplicateEmployeeCode).toBeTruthy();

    await sourceEditButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/edit teacher/i).first()).toBeVisible();
    await dialog.getByLabel(/employee code/i).fill(duplicateEmployeeCode);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/people/teachers/") &&
        response.request().method() === "PATCH",
    );
    await dialog.getByRole("button", { name: /save changes/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), await updateResponse.text()).toBe(false);

    await expect(dialog).toBeVisible();
    await expect(page.getByText(/teacher could not be updated\. review the highlighted fields\./i)).toBeVisible();
  });

  test("@workflow admin people student edit blocks duplicate admission number safely", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const instituteId = "a0fcb56e-672f-460f-b513-d761d7b15899";
    await page.goto(`/admin/people?view=students&institute=${instituteId}`);
    await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();

    const rows = page.locator(".adminPeopleRosterTable tbody tr");
    await expect(rows.first()).toBeVisible();
    await expect(rows.nth(1)).toBeVisible();
    const sourceRow = rows.nth(0);
    const duplicateRow = rows.nth(1);

    const duplicateAdmissionNo =
      ((await duplicateRow.locator("td").nth(1).locator("strong").textContent()) ?? "").trim();
    expect(duplicateAdmissionNo).toBeTruthy();

    await sourceRow.getByRole("button", { name: /^edit$/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/edit student/i).first()).toBeVisible();
    await dialog.getByLabel(/admission no/i).fill(duplicateAdmissionNo);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/admin/people/students/") &&
        response.request().method() === "PATCH",
    );
    await dialog.getByRole("button", { name: /save changes/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), await updateResponse.text()).toBe(false);

    await expect(dialog).toBeVisible();
    await expect(page.getByText(/student could not be updated\. review the highlighted fields\./i)).toBeVisible();
  });
});
