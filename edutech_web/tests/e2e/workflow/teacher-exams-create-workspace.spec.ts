import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

const teacherApiBaseUrl = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.PLAYWRIGHT_API_BASE_URL ??
  "http://127.0.0.1:9001"
).replace(/\/$/, "");

async function openTeacherExamCreate(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/exams/new");
  await expect(page.getByRole("heading", { name: /create exam/i }).first()).toBeVisible();
  await expect(page.getByText(/guided creation/i).first()).toBeVisible();
}

async function deleteTeacherExamDirectly(page: Page, examId: string) {
  try {
    const proxyResponse = await page.request.delete(`/api/teacher/exams/${examId}`, {
      timeout: 15000,
    });
    if (proxyResponse.ok()) {
      return;
    }
  } catch {
    // Fall back to direct backend cleanup.
  }

  const cookies = await page.context().cookies();
  const accessToken = cookies.find((cookie) => cookie.name === "nexora_access_token")?.value ?? "";
  expect(accessToken).not.toBe("");

  const response = await page.request.delete(`${teacherApiBaseUrl}/api/v1/exams/${examId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.describe("Teacher exam create workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow teacher exam-create keeps step validation and handoffs truthful", async ({
    page,
  }) => {
    await openTeacherExamCreate(page);

    await expect(page.getByText(/scope and identity/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^back$/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /scope and identity/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const titleInput = page.getByRole("textbox", { name: /exam title/i });
    const codeInput = page.getByRole("textbox", { name: /exam code/i });

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("tab", { name: /scope and identity/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(titleInput).toBeFocused();
    await expect(titleInput.evaluate((node) => !(node as HTMLInputElement).checkValidity())).resolves.toBe(true);

    await titleInput.fill("Playwright Teacher Route Guardrail");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("tab", { name: /scope and identity/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(codeInput).toBeFocused();
    await expect(codeInput.evaluate((node) => !(node as HTMLInputElement).checkValidity())).resolves.toBe(true);

    await expect(page.getByRole("link", { name: /open advanced builder/i })).toHaveAttribute(
      "href",
      "/teacher/exams/advanced",
    );
  });

  test("@workflow teacher exam-create keeps academic scope hydration truthful", async ({
    page,
  }) => {
    await openTeacherExamCreate(page);

    const programSelect = page.locator('select[name="program"]').first();
    const cohortSelect = page.locator('select[name="cohort"]').first();
    const subjectSelect = page.locator('select[name="subject"]').first();

    await expect(programSelect).toBeVisible();
    await expect(cohortSelect).toBeVisible();
    await expect(subjectSelect).toBeVisible();
    await expect(page.getByText(/family defaults/i).first()).toBeVisible();
    await expect(page.locator('select[name="source_type"]').first()).toHaveValue("teacher");

    await expect
      .poll(async () => cohortSelect.locator("option").count())
      .toBeGreaterThan(0);
    await expect
      .poll(async () => subjectSelect.locator("option").count())
      .toBeGreaterThan(0);

    const programValues = await programSelect.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).filter((value) => value.trim().length > 0),
    );
    expect(programValues.length).toBeGreaterThan(0);

    if (programValues.length > 1) {
      const alternateProgram = programValues[1]!;
      await programSelect.selectOption(alternateProgram);
      await expect
        .poll(async () => page.getByText(/refreshing cohort options|refreshing subject options/i).count())
        .toBe(0);
      await expect
        .poll(async () => cohortSelect.locator("option").count())
        .toBeGreaterThan(0);
      await expect
        .poll(async () => subjectSelect.locator("option").count())
        .toBeGreaterThan(0);
    }
  });

  test("@workflow teacher can create a disposable exam shell from the guided wizard", async ({
    page,
  }) => {
    const uniqueSeed = Date.now();
    const examTitle = `PW Teacher Create Route ${uniqueSeed}`;
    const examCode = `PW-TCR-${uniqueSeed}`;
    let examId: string | null = null;

    try {
      await openTeacherExamCreate(page);

      await page.getByRole("textbox", { name: /exam title/i }).fill(examTitle);
      await page.getByRole("textbox", { name: /exam code/i }).fill(examCode);

      for (let step = 0; step < 3; step += 1) {
        await page.getByRole("button", { name: /^continue$/i }).click();
      }

      await expect(page.getByRole("button", { name: /create exam shell/i })).toBeVisible();
      await page.getByRole("button", { name: /create exam shell/i }).click();

      await expect(page).toHaveURL(/\/teacher\/exams\/.+\/builder\?message=/, {
        timeout: 30000,
      });
      await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();
      await expect(page.getByText(/exam created\. continue with sections, questions, and assignments\./i).first()).toBeVisible();

      const builderBaseUrl = page.url().split("?")[0] ?? page.url();
      const examIdMatch = builderBaseUrl.match(/\/teacher\/exams\/([^/?#]+)/);
      examId = examIdMatch?.[1] ?? null;
      expect(examId).not.toBeNull();

      await expect(page.locator('input[name="title"]')).toHaveValue(examTitle);
      await expect(page.locator('input[name="code"]')).toHaveValue(examCode);
    } finally {
      if (examId) {
        await deleteTeacherExamDirectly(page, examId);
      }
    }
  });
});
