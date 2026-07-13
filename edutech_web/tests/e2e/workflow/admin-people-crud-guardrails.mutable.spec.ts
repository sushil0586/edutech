import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
);

type CreatePayload = {
  id?: string;
};

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

function buildPeopleViewHref(view: "students" | "teachers", instituteId?: string | null) {
  const params = new URLSearchParams();
  params.set("view", view);
  if (instituteId) {
    params.set("institute", instituteId);
  }
  return `/admin/people?${params.toString()}`;
}

async function openTeacherRow(
  page: Parameters<typeof test>[0]["page"],
  employeeCode: string,
  instituteId?: string | null,
) {
  await page.goto(buildPeopleViewHref("teachers", instituteId));
  await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
  await page.getByRole("textbox", { name: /search roster/i }).fill(employeeCode);
  const row = page.locator(".adminPeopleRosterTable tbody tr").filter({ hasText: employeeCode }).first();
  await expect(row).toBeVisible();
  return row;
}

async function openStudentRow(
  page: Parameters<typeof test>[0]["page"],
  admissionNo: string,
  instituteId?: string | null,
) {
  await page.goto(buildPeopleViewHref("students", instituteId));
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  await page.getByRole("textbox", { name: /search roster/i }).fill(admissionNo);
  const row = page.locator(".adminPeopleRosterTable tbody tr").filter({ hasText: admissionNo }).first();
  await expect(row).toBeVisible();
  return row;
}

async function openFirstTeacherRow(
  page: Parameters<typeof test>[0]["page"],
  instituteId?: string | null,
) {
  await page.goto(buildPeopleViewHref("teachers", instituteId));
  await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();
  const row = page
    .locator(".adminPeopleRosterTable tbody tr")
    .filter({ has: page.getByRole("button", { name: /^edit$/i }) })
    .first();
  await expect(row).toBeVisible();
  return row;
}

async function openFirstStudentRow(
  page: Parameters<typeof test>[0]["page"],
  instituteId?: string | null,
) {
  await page.goto(buildPeopleViewHref("students", instituteId));
  await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
  const row = page
    .locator(".adminPeopleRosterTable tbody tr")
    .filter({ has: page.getByRole("button", { name: /^edit$/i }) })
    .first();
  await expect(row).toBeVisible();
  return row;
}

function teacherCreateDialog(page: Parameters<typeof test>[0]["page"]) {
  return page
    .locator('[role="dialog"]')
    .filter({ has: page.getByRole("heading", { name: /new teacher profile/i }) })
    .last();
}

function studentCreateDialog(page: Parameters<typeof test>[0]["page"]) {
  return page
    .locator('[role="dialog"]')
    .filter({ has: page.getByRole("heading", { name: /new student profile/i }) })
    .last();
}

function teacherEditDialog(page: Parameters<typeof test>[0]["page"]) {
  return page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/edit teacher/i) })
    .last();
}

function studentEditDialog(page: Parameters<typeof test>[0]["page"]) {
  return page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/edit student/i) })
    .last();
}

test.describe("Admin people CRUD guardrails", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminRosterActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
      "admin people CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can create teacher and student records with minimum valid browser inputs", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const teacherCode = `PW-MT-${uniqueSeed}`;
    const teacherFirstName = `MinTeacher${uniqueSeed}`;
    const studentAdmissionNo = `PW-MS-${uniqueSeed}`;
    const studentFirstName = `MinStudent${uniqueSeed}`;
    let teacherId: string | null = null;
    let studentId: string | null = null;

    try {
      await page.goto("/admin/people?view=teachers");
      await page.getByRole("button", { name: /^create teacher$/i }).click();
      const teacherDialog = teacherCreateDialog(page);
      await teacherDialog.getByLabel(/employee code/i).fill(teacherCode);
      await teacherDialog.getByLabel(/first name/i).fill(teacherFirstName);
      await teacherDialog.getByLabel(/create login after save/i).uncheck();

      const teacherCreateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/teachers") &&
          response.request().method() === "POST",
      );
      await teacherDialog.getByRole("button", { name: /^create teacher$/i }).last().click();
      const teacherCreateResponse = await teacherCreateResponsePromise;
      expect(teacherCreateResponse.ok(), await teacherCreateResponse.text()).toBe(true);
      const teacherPayload = (await teacherCreateResponse.json()) as CreatePayload;
      teacherId = teacherPayload.id ?? null;
      expect(teacherId).toBeTruthy();

      await expect
        .poll(async () => {
          const response = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
          if (!response.ok()) {
            return null;
          }
          const payload = (await response.json()) as { employee_code?: string; first_name?: string };
          return `${payload.employee_code ?? ""}|${payload.first_name ?? ""}`;
        })
        .toBe(`${teacherCode}|${teacherFirstName}`);

      await page.goto("/admin/people?view=students");
      await page.getByRole("button", { name: /^create student$/i }).click();
      const studentDialog = studentCreateDialog(page);
      await studentDialog.getByLabel(/admission no/i).fill(studentAdmissionNo);
      await studentDialog.getByLabel(/first name/i).fill(studentFirstName);
      await selectFirstNonEmptyOption(studentDialog.getByLabel(/academic year/i));
      await selectFirstNonEmptyOption(studentDialog.getByLabel(/program/i));
      await studentDialog.getByLabel(/create login after save/i).uncheck();

      const studentCreateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/students") &&
          response.request().method() === "POST",
      );
      await studentDialog.getByRole("button", { name: /^create student$/i }).last().click();
      const studentCreateResponse = await studentCreateResponsePromise;
      expect(studentCreateResponse.ok(), await studentCreateResponse.text()).toBe(true);
      const studentPayload = (await studentCreateResponse.json()) as CreatePayload;
      studentId = studentPayload.id ?? null;
      expect(studentId).toBeTruthy();

      await expect
        .poll(async () => {
          const response = await page.request.get(`/api/admin/people/students/${studentId}`);
          if (!response.ok()) {
            return null;
          }
          const payload = (await response.json()) as { admission_no?: string; first_name?: string };
          return `${payload.admission_no ?? ""}|${payload.first_name ?? ""}`;
        })
        .toBe(`${studentAdmissionNo}|${studentFirstName}`);
    } finally {
      if (studentId) {
        const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${studentId}`);
        expect(deleteStudentResponse.ok(), await deleteStudentResponse.text()).toBe(true);
      }
      if (teacherId) {
        const deleteTeacherResponse = await page.request.delete(`/api/admin/people/teachers/${teacherId}`);
        expect(deleteTeacherResponse.ok(), await deleteTeacherResponse.text()).toBe(true);
      }
    }
  });

  test("@workflow @mutable admin people create and edit dialogs reset unsaved values on cancel and reopen", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const teacherCode = `PW-RT-${uniqueSeed}`;
    const teacherFirstName = `ResetTeacher${uniqueSeed}`;
    const studentAdmissionNo = `PW-RS-${uniqueSeed}`;
    const studentFirstName = `ResetStudent${uniqueSeed}`;
    let selectedInstituteId: string | null = null;

    await page.goto("/admin/people?view=teachers");
    selectedInstituteId =
      (await page.locator('select[name="institute"]').inputValue().catch(() => "")) || null;
    await page.getByRole("button", { name: /^create teacher$/i }).click();
    const initialTeacherCreateDialog = teacherCreateDialog(page);
    await initialTeacherCreateDialog.getByLabel(/employee code/i).fill(teacherCode);
    await initialTeacherCreateDialog.getByLabel(/first name/i).fill(teacherFirstName);
    await initialTeacherCreateDialog.getByRole("button", { name: /close/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /^create teacher$/i }).click();
    const reopenedTeacherCreateDialog = teacherCreateDialog(page);
    await expect(reopenedTeacherCreateDialog.getByLabel(/employee code/i)).toHaveValue("");
    await expect(reopenedTeacherCreateDialog.getByLabel(/first name/i)).toHaveValue("");
    await reopenedTeacherCreateDialog.getByRole("button", { name: /close/i }).click();

    const teacherRow = await openFirstTeacherRow(page, selectedInstituteId);
    await teacherRow.getByRole("button", { name: /^edit$/i }).click();
    const initialTeacherEditDialog = teacherEditDialog(page);
    const initialSpecialization = await initialTeacherEditDialog.getByLabel(/specialization/i).inputValue();
    await initialTeacherEditDialog.getByLabel(/specialization/i).fill("Unsaved teacher change");
    await initialTeacherEditDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await teacherRow.getByRole("button", { name: /^edit$/i }).click();
    const reopenedTeacherEditDialog = teacherEditDialog(page);
    await expect(reopenedTeacherEditDialog.getByLabel(/specialization/i)).toHaveValue(initialSpecialization);
    await reopenedTeacherEditDialog.getByRole("button", { name: /cancel/i }).click();

    await page.goto("/admin/people?view=students");
    await page.getByRole("button", { name: /^create student$/i }).click();
    const initialStudentCreateDialog = studentCreateDialog(page);
    await initialStudentCreateDialog.getByLabel(/admission no/i).fill(studentAdmissionNo);
    await initialStudentCreateDialog.getByLabel(/first name/i).fill(studentFirstName);
    await initialStudentCreateDialog.getByRole("button", { name: /close/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: /^create student$/i }).click();
    const reopenedStudentCreateDialog = studentCreateDialog(page);
    await expect(reopenedStudentCreateDialog.getByLabel(/admission no/i)).toHaveValue("");
    await expect(reopenedStudentCreateDialog.getByLabel(/first name/i)).toHaveValue("");
    await reopenedStudentCreateDialog.getByRole("button", { name: /close/i }).click();

    const studentRow = await openFirstStudentRow(page, selectedInstituteId);
    await studentRow.getByRole("button", { name: /^edit$/i }).click();
    const initialStudentEditDialog = studentEditDialog(page);
    const initialGuardianName = await initialStudentEditDialog.getByLabel(/guardian name/i).inputValue();
    await initialStudentEditDialog.getByLabel(/guardian name/i).fill("Unsaved guardian");
    await initialStudentEditDialog.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await studentRow.getByRole("button", { name: /^edit$/i }).click();
    const reopenedStudentEditDialog = studentEditDialog(page);
    await expect(reopenedStudentEditDialog.getByLabel(/guardian name/i)).toHaveValue(initialGuardianName);
    await reopenedStudentEditDialog.getByRole("button", { name: /cancel/i }).click();
  });
});
