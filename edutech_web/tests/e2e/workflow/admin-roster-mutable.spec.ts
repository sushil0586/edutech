import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectAdminWorkspace } from "../helpers/navigation";

const mutableAdminRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
);

type CreatePayload = {
  id?: string;
  detail?: string;
};

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

test.describe("Admin mutable roster actions", () => {
  test.skip(
    testRequiresRole("admin"),
    "Platform admin Playwright credentials are not configured.",
  );

  test.skip(
    !mutableAdminRosterActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ADMIN_ROSTER_ACTIONS",
      "disposable admin roster mutation coverage",
    ),
  );

  test("@workflow @mutable admin can create, edit, and manage roster access for disposable teacher and student records", async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    const uniqueSeed = Date.now();
    const teacherFirstName = `PWAdminTeacher${uniqueSeed}`;
    const teacherLastName = "Mutable";
    const teacherCode = `PW-AT-${uniqueSeed}`;
    const teacherEmail = `pw.admin.teacher.${uniqueSeed}@example.test`;
    const teacherPhone = `91000${String(uniqueSeed).slice(-5)}`;
    const teacherUpdatedSpecialization = "Admin automation updated";

    const studentFirstName = `PWAdminStudent${uniqueSeed}`;
    const studentLastName = "Mutable";
    const studentAdmissionNo = `PW-AS-${uniqueSeed}`;
    const studentEmail = `pw.admin.student.${uniqueSeed}@example.test`;
    const studentPhone = `81000${String(uniqueSeed).slice(-5)}`;
    const guardianPhone = `71000${String(uniqueSeed).slice(-5)}`;
    const updatedGuardianName = "Admin Automation Guardian";

    let teacherId: string | null = null;
    let studentId: string | null = null;

    try {
      await page.goto("/admin/people?view=teachers");
      await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();

      await page.getByRole("button", { name: /^create teacher$/i }).click();
      const teacherDialog = page.getByRole("dialog");
      await expect(teacherDialog.getByRole("heading", { name: /new teacher profile/i })).toBeVisible();
      await teacherDialog.getByLabel(/employee code/i).fill(teacherCode);
      await teacherDialog.getByLabel(/first name/i).fill(teacherFirstName);
      await teacherDialog.getByLabel(/last name/i).fill(teacherLastName);
      await teacherDialog.getByLabel(/^email$/i).fill(teacherEmail);
      await teacherDialog.getByLabel(/^phone$/i).fill(teacherPhone);
      await teacherDialog.getByLabel(/specialization/i).fill("Admin automation");
      await teacherDialog.getByLabel(/create login after save/i).uncheck();

      const teacherCreateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/teachers") &&
          response.request().method() === "POST",
      );
      await teacherDialog.getByRole("button", { name: /^create teacher$/i }).last().click();
      const teacherCreateResponse = await teacherCreateResponsePromise;
      expect(teacherCreateResponse.ok()).toBe(true);
      const teacherCreatePayload = (await teacherCreateResponse.json()) as CreatePayload;
      teacherId = teacherCreatePayload.id ?? null;
      expect(teacherId).not.toBeNull();

      await page.goto("/admin/people?view=teachers");
      const teacherSearch = page.getByRole("textbox", { name: /search roster/i });
      await teacherSearch.fill(teacherCode);
      const teacherRow = page.getByRole("row", { name: new RegExp(teacherCode, "i") });
      await expect(teacherRow).toBeVisible();

      await teacherRow.getByRole("button", { name: /^edit$/i }).click();
      const teacherEditDialog = page.getByRole("dialog");
      await expect(teacherEditDialog.getByRole("heading", { name: new RegExp(teacherFirstName, "i") })).toBeVisible();
      await teacherEditDialog.getByLabel(/specialization/i).fill(teacherUpdatedSpecialization);
      const teacherUpdateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/people/teachers/${teacherId}`) &&
          response.request().method() === "PATCH",
      );
      await teacherEditDialog.getByRole("button", { name: /save changes/i }).click();
      const teacherUpdateResponse = await teacherUpdateResponsePromise;
      expect(teacherUpdateResponse.ok()).toBe(true);
      await expect(page.getByRole("row", { name: new RegExp(teacherCode, "i") })).toContainText(
        teacherUpdatedSpecialization,
      );

      const createTeacherLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/account-management/teachers/${teacherId}/create-login`) &&
          response.request().method() === "POST",
      );
      await teacherRow.getByRole("button", { name: /create login/i }).click();
      const createTeacherLoginResponse = await createTeacherLoginResponsePromise;
      expect(createTeacherLoginResponse.ok()).toBe(true);
      await expect(page.getByText(/created login for/i).last()).toBeVisible();

      const resetTeacherPasswordResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/reset-password") &&
          response.request().method() === "POST",
      );
      await teacherRow.getByRole("button", { name: /reset password/i }).click();
      const resetDialog = page.getByRole("dialog");
      await expect(resetDialog.getByRole("heading", { name: /update login password/i })).toBeVisible();
      await resetDialog.getByLabel(/auto-generate password/i).check();
      await resetDialog.getByRole("button", { name: /^reset password$/i }).click();
      const resetTeacherPasswordResponse = await resetTeacherPasswordResponsePromise;
      expect(resetTeacherPasswordResponse.ok()).toBe(true);
      await expect(page.getByText(/password reset for/i).last()).toBeVisible();

      const disableTeacherLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/disable") &&
          response.request().method() === "POST",
      );
      await teacherRow.getByRole("button", { name: /disable login/i }).click();
      const disableTeacherLoginResponse = await disableTeacherLoginResponsePromise;
      expect(disableTeacherLoginResponse.ok()).toBe(true);
      await expect(teacherRow.getByRole("button", { name: /enable login/i })).toBeVisible();

      const enableTeacherLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/account-management/users/") &&
          response.url().includes("/enable") &&
          response.request().method() === "POST",
      );
      await teacherRow.getByRole("button", { name: /enable login/i }).click();
      const enableTeacherLoginResponse = await enableTeacherLoginResponsePromise;
      expect(enableTeacherLoginResponse.ok()).toBe(true);
      await expect(teacherRow.getByRole("button", { name: /disable login/i })).toBeVisible();

      await page.goto("/admin/people?view=students");
      await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
      await page.getByRole("button", { name: /^create student$/i }).click();
      const studentDialog = page.getByRole("dialog");
      await expect(studentDialog.getByRole("heading", { name: /new student profile/i })).toBeVisible();
      await studentDialog.getByLabel(/admission no/i).fill(studentAdmissionNo);
      await studentDialog.getByLabel(/first name/i).fill(studentFirstName);
      await studentDialog.getByLabel(/last name/i).fill(studentLastName);
      await studentDialog.getByLabel(/^email$/i).fill(studentEmail);
      await studentDialog.getByLabel(/^phone$/i).fill(studentPhone);
      await studentDialog.getByLabel(/guardian name/i).fill("Playwright Guardian");
      await studentDialog.getByLabel(/guardian phone/i).fill(guardianPhone);

      const academicYearValue = firstNonEmptyOptionValue(
        await studentDialog.getByLabel(/academic year/i).locator("option").evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
      );
      const programValue = firstNonEmptyOptionValue(
        await studentDialog.getByLabel(/program/i).locator("option").evaluateAll((options) =>
          options.map((option) => (option as HTMLOptionElement).value),
        ),
      );
      expect(
        academicYearValue,
        "At least one academic year must exist for admin mutable roster coverage.",
      ).not.toBeNull();
      expect(programValue, "At least one program must exist for admin mutable roster coverage.").not.toBeNull();

      await studentDialog.getByLabel(/academic year/i).selectOption(academicYearValue!);
      await studentDialog.getByLabel(/program/i).selectOption(programValue!);
      await studentDialog.getByLabel(/create login after save/i).uncheck();

      const cohortOptions = await studentDialog
        .getByLabel(/cohort/i)
        .locator("option")
        .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
      const cohortValue = firstNonEmptyOptionValue(cohortOptions);
      if (cohortValue) {
        await studentDialog.getByLabel(/cohort/i).selectOption(cohortValue);
      }

      const studentCreateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/students") &&
          response.request().method() === "POST",
      );
      await studentDialog.getByRole("button", { name: /^create student$/i }).last().click();
      const studentCreateResponse = await studentCreateResponsePromise;
      expect(studentCreateResponse.ok()).toBe(true);
      const studentCreatePayload = (await studentCreateResponse.json()) as CreatePayload;
      studentId = studentCreatePayload.id ?? null;
      expect(studentId).not.toBeNull();

      await page.goto("/admin/people?view=students");
      const studentSearch = page.getByRole("textbox", { name: /search roster/i });
      await studentSearch.fill(studentAdmissionNo);
      const studentRow = page.getByRole("row", { name: new RegExp(studentAdmissionNo, "i") });
      await expect(studentRow).toBeVisible();

      await studentRow.getByRole("button", { name: /^edit$/i }).click();
      const studentEditDialog = page.getByRole("dialog");
      await expect(studentEditDialog.getByRole("heading", { name: new RegExp(studentFirstName, "i") })).toBeVisible();
      await studentEditDialog.getByLabel(/guardian name/i).fill(updatedGuardianName);
      const studentUpdateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/people/students/${studentId}`) &&
          response.request().method() === "PATCH",
      );
      await studentEditDialog.getByRole("button", { name: /save changes/i }).click();
      const studentUpdateResponse = await studentUpdateResponsePromise;
      expect(studentUpdateResponse.ok()).toBe(true);

      await page.goto("/admin/people?view=students");
      await studentSearch.fill(studentAdmissionNo);
      const refreshedStudentRow = page.getByRole("row", { name: new RegExp(studentAdmissionNo, "i") });
      await refreshedStudentRow.getByRole("button", { name: /^edit$/i }).click();
      const refreshedStudentEditDialog = page.getByRole("dialog");
      await expect(refreshedStudentEditDialog.getByLabel(/guardian name/i)).toHaveValue(updatedGuardianName);
      await refreshedStudentEditDialog.getByRole("button", { name: /close/i }).click();
      await expect(refreshedStudentEditDialog).toBeHidden();

      const createStudentLoginResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/account-management/students/${studentId}/create-login`) &&
          response.request().method() === "POST",
      );
      await refreshedStudentRow.getByRole("button", { name: /create login/i }).click();
      const createStudentLoginResponse = await createStudentLoginResponsePromise;
      expect(createStudentLoginResponse.ok()).toBe(true);
      await expect(page.getByText(/created login for/i).last()).toBeVisible();
    } finally {
      if (studentId) {
        const deleteStudentResponse = await page.request.delete(`/api/admin/people/students/${studentId}`);
        expect(deleteStudentResponse.ok()).toBe(true);
      }

      if (teacherId) {
        const deleteTeacherResponse = await page.request.delete(`/api/admin/people/teachers/${teacherId}`);
        expect(deleteTeacherResponse.ok()).toBe(true);
      }
    }
  });
});
