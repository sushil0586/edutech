import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableRosterActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS",
);

type CreatePayload = {
  id?: string;
  detail?: string;
};

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

test.describe("Institute mutable roster actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableRosterActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_ROSTER_ACTIONS",
      "disposable roster mutation coverage",
    ),
  );

  test("@workflow @mutable institute can create disposable teacher and student records and clean them up through scoped admin APIs", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const teacherFirstName = `PWTeacher${uniqueSeed}`;
    const teacherLastName = "Mutable";
    const teacherCode = `PW-T-${uniqueSeed}`;
    const teacherEmail = `pw.teacher.${uniqueSeed}@example.test`;
    const teacherPhone = `90000${String(uniqueSeed).slice(-5)}`;

    const studentFirstName = `PWStudent${uniqueSeed}`;
    const studentLastName = "Mutable";
    const studentAdmissionNo = `PW-S-${uniqueSeed}`;
    const studentEmail = `pw.student.${uniqueSeed}@example.test`;
    const studentPhone = `80000${String(uniqueSeed).slice(-5)}`;
    const guardianPhone = `70000${String(uniqueSeed).slice(-5)}`;

    let teacherId: string | null = null;
    let studentId: string | null = null;

    try {
      await page.goto("/institute/people?view=teachers");
      await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();

      await page.getByRole("button", { name: /^create teacher$/i }).click();
      const teacherDialog = page.getByRole("dialog");
      await expect(teacherDialog.getByRole("heading", { name: /new teacher profile/i })).toBeVisible();
      await teacherDialog.getByLabel(/employee code/i).fill(teacherCode);
      await teacherDialog.getByLabel(/first name/i).fill(teacherFirstName);
      await teacherDialog.getByLabel(/last name/i).fill(teacherLastName);
      await teacherDialog.getByLabel(/^email$/i).fill(teacherEmail);
      await teacherDialog.getByLabel(/^phone$/i).fill(teacherPhone);
      await teacherDialog.getByLabel(/specialization/i).fill("Playwright automation");
      await teacherDialog.getByLabel(/create login after save/i).check();

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

      await page.goto("/institute/people?view=teachers");
      await expect(page.getByRole("heading", { name: /teacher roster/i })).toBeVisible();

      await page.goto("/institute/people?view=students");
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

      expect(academicYearValue, "At least one academic year must exist for mutable roster coverage.").not.toBeNull();
      expect(programValue, "At least one program must exist for mutable roster coverage.").not.toBeNull();

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

      await page.goto("/institute/people?view=students");
      await expect(page.getByRole("heading", { name: /student roster/i })).toBeVisible();
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
