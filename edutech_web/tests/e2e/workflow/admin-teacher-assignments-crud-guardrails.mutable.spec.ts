import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminTeacherAssignmentActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_TEACHER_ASSIGNMENT_ACTIONS",
);

type CreatePayload = {
  id?: string;
};

type TeacherPayload = {
  id?: string;
};

type ProgramRecord = {
  id: string;
};

type AcademicYearRecord = {
  id: string;
};

type SubjectRecord = {
  id: string;
  program?: string | null;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function selectedInstituteId(page: Page) {
  const select = page.getByLabel(/select institute/i);
  await expect(select).toBeVisible();
  return select.inputValue();
}

function buildAssignmentsSectionHref(instituteId?: string | null) {
  const params = new URLSearchParams();
  params.set("section", "teacher-assignments");
  if (instituteId) {
    params.set("institute", instituteId);
  }
  return `/admin/academic-setup?${params.toString()}`;
}

async function openAssignmentsSection(page: Page, instituteId?: string | null) {
  await page.goto(buildAssignmentsSectionHref(instituteId));
  await expect(page).toHaveURL(/\/admin\/academic-setup\?.*section=teacher-assignments/);
  await expect(page.getByRole("button", { name: /^add$/i })).toBeVisible();
}

async function assignmentDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function fetchFirstRecord<T extends { id: string }>(page: Page, path: string) {
  const response = await page.request.get(path);
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { results?: T[] } | T[];
  const records = Array.isArray(body) ? body : (body.results ?? []);
  expect(records.length).toBeGreaterThan(0);
  return records[0]!;
}

async function createTeacher(page: Page, instituteId: string, uniqueSeed: number) {
  const response = await page.request.post("/api/admin/people/teachers", {
    data: {
      institute: instituteId,
      employee_code: `PW-AT-${uniqueSeed}`,
      first_name: `Assign${uniqueSeed}`,
      last_name: "Teacher",
      email: `pw.admin.assignment.${uniqueSeed}@example.test`,
      phone: `92222${String(uniqueSeed).slice(-5)}`,
      specialization: "Admin teacher assignment guardrail coverage",
      is_active: true,
      create_login: false,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const payload = (await response.json()) as TeacherPayload;
  expect(payload.id).toBeTruthy();
  return payload.id!;
}

async function createAssignment(
  page: Page,
  payload: {
    instituteId: string;
    teacherId: string;
    academicYearId: string;
    programId: string;
    subjectId: string;
    isPrimary?: boolean;
    assignmentRole?: string;
  },
) {
  const response = await page.request.post("/api/admin/teacher-assignments", {
    data: {
      institute: payload.instituteId,
      teacher: payload.teacherId,
      academic_year: payload.academicYearId,
      program: payload.programId,
      cohort: null,
      subject: payload.subjectId,
      assignment_role: payload.assignmentRole ?? "main_teacher",
      is_primary: payload.isPrimary ?? true,
      is_active: true,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as CreatePayload;
  expect(body.id).toBeTruthy();
  return body.id!;
}

async function deleteAssignment(page: Page, assignmentId: string | null) {
  if (!assignmentId) {
    return;
  }
  const response = await page.request.delete(`/api/admin/teacher-assignments/${assignmentId}`);
  expect(response.ok(), await response.text()).toBe(true);
}

async function deleteTeacher(page: Page, teacherId: string | null) {
  if (!teacherId) {
    return;
  }
  const response = await page.request.delete(`/api/admin/people/teachers/${teacherId}`);
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Admin teacher assignments CRUD guardrails", () => {
  test.skip(testRequiresRole("admin"), "Platform admin Playwright credentials are not configured.");

  test.skip(
    !mutableAdminTeacherAssignmentActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_TEACHER_ASSIGNMENT_ACTIONS",
      "admin teacher-assignment CRUD guardrail coverage",
    ),
  );

  test("@workflow @mutable admin can create a teacher assignment with minimum valid browser inputs", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await openAssignmentsSection(page);

    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const teacherId = await createTeacher(page, instituteId, uniqueSeed);
    let assignmentId: string | null = null;

    try {
      await openAssignmentsSection(page, instituteId);

      await page.getByRole("button", { name: /^add$/i }).click();
      const dialog = await assignmentDialog(page);

      const academicYear = await fetchFirstRecord<AcademicYearRecord>(
        page,
        `/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=100`,
      );
      const program = await fetchFirstRecord<ProgramRecord>(
        page,
        `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=100`,
      );
      const subjectResponse = await page.request.get(
        `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=100`,
      );
      expect(subjectResponse.ok(), await subjectResponse.text()).toBe(true);
      const subjectBody = (await subjectResponse.json()) as { results?: SubjectRecord[] } | SubjectRecord[];
      const subjects = Array.isArray(subjectBody) ? subjectBody : (subjectBody.results ?? []);
      const subject = subjects.find((item) => item.program === null || item.program === program.id) ?? null;
      expect(subject).not.toBeNull();

      await dialog.getByRole("combobox", { name: /^teacher$/i }).selectOption(teacherId);
      await dialog.getByRole("combobox", { name: /^academic year$/i }).selectOption(academicYear.id);
      await dialog.getByRole("combobox", { name: /^program$/i }).selectOption(program.id);
      await dialog.getByRole("combobox", { name: /^subject$/i }).selectOption(subject!.id);
      await dialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/teacher-assignments") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /create assignment/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok(), await createResponse.text()).toBe(true);
      const createPayload = (await createResponse.json()) as CreatePayload;
      assignmentId = createPayload.id ?? null;
      expect(assignmentId).toBeTruthy();

      await expect(dialog).toBeHidden();
      const createdRow = page.locator(".academicRecordTable tbody tr").filter({
        has: page.getByText(new RegExp(`Assign${uniqueSeed}\\s+Teacher`, "i")),
      }).first();
      await expect(createdRow).toBeVisible();
      await createdRow.getByRole("button", { name: /^edit$/i }).click();
      const reopenedDialog = await assignmentDialog(page);
      await expect(reopenedDialog.getByRole("combobox", { name: /^teacher$/i })).toHaveValue(teacherId);
      await expect(reopenedDialog.getByRole("combobox", { name: /^academic year$/i })).toHaveValue(academicYear.id);
      await expect(reopenedDialog.getByRole("combobox", { name: /^program$/i })).toHaveValue(program.id);
      await expect(reopenedDialog.getByRole("combobox", { name: /^subject$/i })).toHaveValue(subject!.id);
      await expect(reopenedDialog.getByRole("combobox", { name: /assignment role/i })).toHaveValue("main_teacher");
      await expect(reopenedDialog.getByRole("checkbox", { name: /primary assignment/i })).not.toBeChecked();
      await expect(reopenedDialog.getByRole("checkbox", { name: /^active$/i })).toBeChecked();
      await reopenedDialog.getByRole("button", { name: /cancel/i }).click();
    } finally {
      await deleteAssignment(page, assignmentId);
      await deleteTeacher(page, teacherId);
    }
  });

  test("@workflow @mutable admin teacher assignment dialogs reset unsaved values and keep canceled edits truthful", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
    await openAssignmentsSection(page);

    const instituteId = await selectedInstituteId(page);
    expect(instituteId).toBeTruthy();

    const uniqueSeed = Date.now();
    const teacherId = await createTeacher(page, instituteId, uniqueSeed);
    const academicYear = await fetchFirstRecord<AcademicYearRecord>(
      page,
      `/api/admin/academics/academic-years?institute=${encodeURIComponent(instituteId)}&page_size=100`,
    );
    const program = await fetchFirstRecord<ProgramRecord>(
      page,
      `/api/admin/academics/programs?institute=${encodeURIComponent(instituteId)}&page_size=100`,
    );
    const subjectResponse = await page.request.get(
      `/api/admin/academics/subjects?institute=${encodeURIComponent(instituteId)}&page_size=100`,
    );
    expect(subjectResponse.ok(), await subjectResponse.text()).toBe(true);
    const subjectBody = (await subjectResponse.json()) as { results?: SubjectRecord[] } | SubjectRecord[];
    const subjects = Array.isArray(subjectBody) ? subjectBody : (subjectBody.results ?? []);
    const subject = subjects.find((item) => item.program === null || item.program === program.id) ?? null;
    expect(subject).not.toBeNull();

    let assignmentId: string | null = null;

    try {
      await openAssignmentsSection(page, instituteId);

      await page.getByRole("button", { name: /^add$/i }).click();
      const createDialog = await assignmentDialog(page);
      await createDialog.getByRole("combobox", { name: /^teacher$/i }).selectOption(teacherId);
      await createDialog.getByRole("combobox", { name: /^academic year$/i }).selectOption(academicYear.id);
      await createDialog.getByRole("combobox", { name: /^program$/i }).selectOption(program.id);
      await createDialog.getByRole("combobox", { name: /^subject$/i }).selectOption(subject!.id);
      await createDialog.getByRole("combobox", { name: /assignment role/i }).selectOption("mentor");
      await createDialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();
      await createDialog.getByRole("checkbox", { name: /^active$/i }).uncheck();
      await createDialog.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.getByRole("button", { name: /^add$/i }).click();
      const reopenedCreateDialog = await assignmentDialog(page);
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /^teacher$/i })).toHaveValue("");
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /^academic year$/i })).toHaveValue("");
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /^program$/i })).toHaveValue("");
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /^cohort$/i })).toHaveValue("");
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /^subject$/i })).toHaveValue("");
      await expect(reopenedCreateDialog.getByRole("combobox", { name: /assignment role/i })).toHaveValue("main_teacher");
      await expect(reopenedCreateDialog.getByRole("checkbox", { name: /primary assignment/i })).toBeChecked();
      await expect(reopenedCreateDialog.getByRole("checkbox", { name: /^active$/i })).toBeChecked();
      await reopenedCreateDialog.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      assignmentId = await createAssignment(page, {
        instituteId,
        teacherId,
        academicYearId: academicYear.id,
        programId: program.id,
        subjectId: subject!.id,
        isPrimary: false,
      });

      await page.reload();
      const row = page.locator(".academicRecordTable tbody tr").filter({
        has: page.getByText(new RegExp(escapeRegExp(`Assign${uniqueSeed} Teacher`), "i")),
      }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(/main teacher/i);

      await row.getByRole("button", { name: /^edit$/i }).click();
      const editDialog = await assignmentDialog(page);
      await editDialog.getByRole("combobox", { name: /assignment role/i }).selectOption("assistant");
      await editDialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();
      await editDialog.getByRole("checkbox", { name: /^active$/i }).uncheck();
      await editDialog.getByRole("button", { name: /cancel/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await expect(row).toContainText(/main teacher/i);
      await expect(row).not.toContainText(/archived/i);

      await row.getByRole("button", { name: /^edit$/i }).click();
      const reopenedEditDialog = await assignmentDialog(page);
      await expect(reopenedEditDialog.getByRole("combobox", { name: /^teacher$/i })).toHaveValue(teacherId);
      await expect(reopenedEditDialog.getByRole("combobox", { name: /^academic year$/i })).toHaveValue(academicYear.id);
      await expect(reopenedEditDialog.getByRole("combobox", { name: /^program$/i })).toHaveValue(program.id);
      await expect(reopenedEditDialog.getByRole("combobox", { name: /^subject$/i })).toHaveValue(subject!.id);
      await expect(reopenedEditDialog.getByRole("combobox", { name: /assignment role/i })).toHaveValue("main_teacher");
      await expect(reopenedEditDialog.getByRole("checkbox", { name: /primary assignment/i })).not.toBeChecked();
      await expect(reopenedEditDialog.getByRole("checkbox", { name: /^active$/i })).toBeChecked();
      await reopenedEditDialog.getByRole("button", { name: /cancel/i }).click();

      await row.getByRole("button", { name: /^edit$/i }).click();
      const truthDialog = await assignmentDialog(page);
      await expect(truthDialog.getByRole("combobox", { name: /assignment role/i })).toHaveValue("main_teacher");
      await expect(truthDialog.getByRole("checkbox", { name: /primary assignment/i })).not.toBeChecked();
      await expect(truthDialog.getByRole("checkbox", { name: /^active$/i })).toBeChecked();
      await truthDialog.getByRole("button", { name: /cancel/i }).click();
    } finally {
      await deleteAssignment(page, assignmentId);
      await deleteTeacher(page, teacherId);
    }
  });
});
