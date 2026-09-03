import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { isMutableLaneEnabled, mutableLaneMessage } from "../helpers/mutable";
import { expectInstituteWorkspace } from "../helpers/navigation";

const mutableTeacherAssignmentActionsEnabled = isMutableLaneEnabled(
  "PLAYWRIGHT_ENABLE_MUTABLE_TEACHER_ASSIGNMENT_ACTIONS",
);
const instituteApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

type CreatePayload = {
  id?: string;
};

type TeacherAssignmentRow = {
  teacher: string;
};

function normalizeRenderedOptionLabel(label: string) {
  return label.replace(/\s+\(inactive\)$/i, "").trim();
}

function teacherRowLabelFromOption(label: string) {
  return normalizeRenderedOptionLabel(label).replace(/\s+\([^)]*\)\s*$/, "").trim();
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

async function deleteIfPresent(
  page: import("@playwright/test").Page,
  path: string,
) {
  try {
    const response = await page.request.delete(path, {
      timeout: 5000,
    });
    expect(response.ok()).toBe(true);
  } catch {
    // Cleanup should not mask the main browser workflow assertion result.
  }
}

async function getAccessToken(page: import("@playwright/test").Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
}

async function listAssignedTeacherIds(page: import("@playwright/test").Page) {
  const accessToken = await getAccessToken(page);
  expect(accessToken).not.toBe("");

  const response = await page.request.get(`${instituteApiBaseUrl}/api/v1/teachers/assignments/?page_size=200`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { results?: TeacherAssignmentRow[] } | TeacherAssignmentRow[];
  const rows = Array.isArray(body) ? body : (body.results ?? []);
  return new Set(rows.map((row) => row.teacher));
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
    let assignmentId: string | null = null;

    try {
      await page.goto("/institute/teacher-assignments");
      await expect(page.getByRole("heading", { name: /teacher assignments/i }).first()).toBeVisible();

      const rowsBefore = await page.locator("table tbody tr").count();
      await page.getByRole("button", { name: /^add$/i }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: /add teacher assignment/i })).toBeVisible();

      const teacherSelect = dialog.getByRole("combobox", { name: /^teacher$/i });
      const assignedTeacherIds = await listAssignedTeacherIds(page);
      const teacherOptions = await teacherSelect.locator("option").evaluateAll((nodes) =>
        nodes.map((node) => ({
          value: (node as HTMLOptionElement).value,
          label: (node as HTMLOptionElement).label.trim(),
        })),
      );
      const teacherOption =
        teacherOptions.find(
          (option) => option.value.trim().length > 0 && !assignedTeacherIds.has(option.value),
        ) ??
        teacherOptions.find((option) => option.value.trim().length > 0) ??
        null;
      expect(teacherOption).not.toBeNull();
      await teacherSelect.selectOption(teacherOption!.value);
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

      const selectedTeacherLabel = teacherRowLabelFromOption(teacherOption.label);
      const createdRow = page.locator("table tbody tr").filter({
        has: page.getByText(new RegExp(selectedTeacherLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
      }).first();
      await expect(createdRow).toBeVisible();
      await expect(createdRow).toContainText(normalizeRenderedOptionLabel(subjectOption.label));
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
        has: page.getByText(new RegExp(selectedTeacherLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
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
        await deleteIfPresent(page, `/api/admin/teacher-assignments/${assignmentId}`);
      }
    }
  });
});
