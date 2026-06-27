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

type TeacherDetail = {
  id: string;
  employee_code: string;
  specialization: string;
  has_login: boolean;
  login_is_active: boolean;
  account_user_id: number | null;
};

type StudentDetail = {
  id: string;
  admission_no: string;
  guardian_name?: string;
  has_login: boolean;
  login_is_active: boolean;
  account_user_id: number | null;
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

      await expect
        .poll(async () => {
          const teacherDetailResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
          if (!teacherDetailResponse.ok()) {
            return null;
          }
          return (await teacherDetailResponse.json()) as TeacherDetail;
        })
        .toMatchObject({ employee_code: teacherCode, has_login: false });

      const teacherUpdateResponse = await page.request.patch(`/api/admin/people/teachers/${teacherId}`, {
        data: {
          specialization: teacherUpdatedSpecialization,
        },
      });
      expect(teacherUpdateResponse.ok()).toBe(true);
      await expect
        .poll(async () => {
          const teacherDetailResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
          expect(teacherDetailResponse.ok()).toBe(true);
          const teacherDetail = (await teacherDetailResponse.json()) as TeacherDetail;
          return teacherDetail.specialization;
        })
        .toBe(teacherUpdatedSpecialization);

      const createTeacherLoginResponse = await page.request.post(
        `/api/admin/account-management/teachers/${teacherId}/create-login`,
        {
          data: { auto_generate: true },
        },
      );
      expect(createTeacherLoginResponse.ok()).toBe(true);
      let teacherDetailResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
      expect(teacherDetailResponse.ok()).toBe(true);
      let teacherDetail = (await teacherDetailResponse.json()) as TeacherDetail;
      expect(teacherDetail.has_login).toBe(true);
      expect(teacherDetail.account_user_id).not.toBeNull();

      const resetTeacherPasswordResponse = await page.request.post(
        `/api/admin/account-management/users/${teacherDetail.account_user_id}/reset-password`,
        {
          data: { auto_generate: true },
        },
      );
      expect(resetTeacherPasswordResponse.ok()).toBe(true);

      const disableTeacherLoginResponse = await page.request.post(
        `/api/admin/account-management/users/${teacherDetail.account_user_id}/disable`,
      );
      expect(disableTeacherLoginResponse.ok()).toBe(true);
      teacherDetailResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
      expect(teacherDetailResponse.ok()).toBe(true);
      teacherDetail = (await teacherDetailResponse.json()) as TeacherDetail;
      expect(teacherDetail.login_is_active).toBe(false);

      const enableTeacherLoginResponse = await page.request.post(
        `/api/admin/account-management/users/${teacherDetail.account_user_id}/enable`,
      );
      expect(enableTeacherLoginResponse.ok()).toBe(true);
      teacherDetailResponse = await page.request.get(`/api/admin/people/teachers/${teacherId}`);
      expect(teacherDetailResponse.ok()).toBe(true);
      teacherDetail = (await teacherDetailResponse.json()) as TeacherDetail;
      expect(teacherDetail.login_is_active).toBe(true);

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

      await expect
        .poll(async () => {
          const studentDetailResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
          if (!studentDetailResponse.ok()) {
            return null;
          }
          return (await studentDetailResponse.json()) as StudentDetail;
        })
        .toMatchObject({ admission_no: studentAdmissionNo, has_login: false });

      const studentUpdateResponse = await page.request.patch(`/api/admin/people/students/${studentId}`, {
        data: {
          guardian_name: updatedGuardianName,
        },
      });
      expect(studentUpdateResponse.ok()).toBe(true);
      await expect
        .poll(async () => {
          const studentDetailResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
          expect(studentDetailResponse.ok()).toBe(true);
          const studentDetail = (await studentDetailResponse.json()) as StudentDetail;
          return studentDetail.guardian_name ?? "";
        })
        .toBe(updatedGuardianName);

      const createStudentLoginResponse = await page.request.post(
        `/api/admin/account-management/students/${studentId}/create-login`,
        {
          data: { auto_generate: true },
        },
      );
      expect(createStudentLoginResponse.ok()).toBe(true);
      const studentDetailResponse = await page.request.get(`/api/admin/people/students/${studentId}`);
      expect(studentDetailResponse.ok()).toBe(true);
      const studentDetail = (await studentDetailResponse.json()) as StudentDetail;
      expect(studentDetail.has_login).toBe(true);
      expect(studentDetail.account_user_id).not.toBeNull();
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
