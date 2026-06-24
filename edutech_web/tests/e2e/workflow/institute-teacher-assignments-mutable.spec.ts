import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableTeacherAssignmentActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS",
);

type CreatePayload = {
  id?: string;
};

function firstNonEmptyOptionValue(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? null;
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const options = await locator.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label.trim(),
    })),
  );
  const option = options.find((entry) => entry.value.trim().length > 0) ?? null;
  expect(option).not.toBeNull();
  await locator.selectOption(option!.value);
  return option!;
}

test.describe("Institute mutable teacher-assignment actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test.skip(
    !mutableTeacherAssignmentActionsEnabled,
    mutableLaneMessage(
      "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS",
      "disposable teacher-assignment coverage",
    ),
  );

  test("@workflow @mutable institute can create, edit, archive, and restore a disposable teacher assignment", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    const uniqueSeed = Date.now();
    const teacherCode = `PW-TA-${uniqueSeed}`;
    const teacherFirstName = `PWAssign${uniqueSeed}`;
    const teacherLastName = "Teacher";
    const teacherEmail = `pw.assign.${uniqueSeed}@example.test`;
    const teacherPhone = `91111${String(uniqueSeed).slice(-5)}`;

    let teacherId: string | null = null;
    let assignmentId: string | null = null;

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
      await teacherDialog.getByLabel(/specialization/i).fill("Playwright teacher assignment coverage");
      await teacherDialog.getByLabel(/create login after save/i).uncheck();

      const teacherCreateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/people/teachers") &&
          response.request().method() === "POST",
      );
      await teacherDialog.getByRole("button", { name: /^create teacher$/i }).last().click();
      const teacherCreateResponse = await teacherCreateResponsePromise;
      expect(teacherCreateResponse.ok()).toBe(true);
      const teacherPayload = (await teacherCreateResponse.json()) as CreatePayload;
      teacherId = teacherPayload.id ?? null;
      expect(teacherId).not.toBeNull();

      await page.goto("/institute/teacher-assignments");
      await expect(page.getByRole("heading", { name: /teacher assignments/i }).first()).toBeVisible();

      const rowsBefore = await page.locator("table tbody tr").count();
      await page.getByRole("button", { name: /^add$/i }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /add teacher assignment/i })).toBeVisible();

      await dialog.getByRole("combobox", { name: /^teacher$/i }).selectOption(teacherId!);
      await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^academic year$/i }));
      await selectFirstNonEmptyOption(dialog.getByRole("combobox", { name: /^program$/i }));

      const subjectOption = await selectFirstNonEmptyOption(
        dialog.getByRole("combobox", { name: /^subject$/i }),
      );
      await dialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/admin/teacher-assignments") &&
          response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: /create assignment/i }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBe(true);
      const createPayload = (await createResponse.json()) as CreatePayload;
      assignmentId = createPayload.id ?? null;
      expect(assignmentId).not.toBeNull();

      const createdRow = page.locator("table tbody tr").filter({
        has: page.getByText(new RegExp(`${teacherFirstName}\\s+${teacherLastName}`, "i")),
      }).first();
      await expect(createdRow).toBeVisible();
      await expect(createdRow).toContainText(subjectOption.label);
      await expect(page.locator("table tbody tr")).toHaveCount(rowsBefore + 1);

      await createdRow.getByRole("button", { name: /edit/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog.getByRole("heading", { name: /edit teacher assignment/i })).toBeVisible();
      await editDialog.getByRole("combobox", { name: /assignment role/i }).selectOption("assistant");
      await editDialog.getByRole("checkbox", { name: /primary assignment/i }).uncheck();

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/teacher-assignments/${assignmentId}`) &&
          response.request().method() === "PATCH",
      );
      await editDialog.getByRole("button", { name: /update assignment/i }).click();
      const updateResponse = await updateResponsePromise;
      expect(updateResponse.ok()).toBe(true);

      await expect(createdRow).toContainText(/assistant/i);

      await createdRow.getByRole("button", { name: /edit/i }).click();
      await expect(page.getByRole("dialog").getByRole("combobox", { name: /assignment role/i })).toHaveValue("assistant");
      await expect(page.getByRole("dialog").getByRole("checkbox", { name: /primary assignment/i })).not.toBeChecked();
      await page.getByRole("dialog").getByRole("button", { name: /cancel|close/i }).last().click();

      page.once("dialog", async (dialogEvent) => {
        await dialogEvent.accept();
      });
      const archiveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/teacher-assignments/${assignmentId}`) &&
          response.request().method() === "DELETE",
      );
      await createdRow.getByRole("button", { name: /archive/i }).click();
      const archiveResponse = await archiveResponsePromise;
      expect(archiveResponse.ok()).toBe(true);

      await expect(createdRow).toHaveCount(0);

      await page.getByRole("checkbox", { name: /show archived/i }).check();
      const archivedRow = page.locator("table tbody tr").filter({
        has: page.getByText(new RegExp(`${teacherFirstName}\\s+${teacherLastName}`, "i")),
      }).first();
      await expect(archivedRow).toBeVisible();
      await expect(archivedRow).toContainText(/archived/i);

      const restoreResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/admin/teacher-assignments/${assignmentId}`) &&
          response.request().method() === "PATCH",
      );
      await archivedRow.getByRole("button", { name: /restore/i }).click();
      const restoreResponse = await restoreResponsePromise;
      expect(restoreResponse.ok()).toBe(true);
      await expect(archivedRow).not.toContainText(/archived/i);
    } finally {
      if (assignmentId) {
        const deleteAssignmentResponse = await page.request.delete(
          `/api/admin/teacher-assignments/${assignmentId}`,
        );
        expect(deleteAssignmentResponse.ok()).toBe(true);
      }

      if (teacherId) {
        const deleteTeacherResponse = await page.request.delete(`/api/admin/people/teachers/${teacherId}`);
        expect(deleteTeacherResponse.ok()).toBe(true);
      }
    }
  });
});
