import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openQuestionDetailHref(page: Page) {
  await gotoWithRuntimeRecovery(page, "/institute/question-bank");
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

  const editLink = page.getByRole("link", { name: /edit|duplicate to edit/i }).first();
  await expect(editLink).toBeVisible();
  const href = await editLink.getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

test.describe("Institute question create browser functionality coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute question-create validation visible", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
    await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
    await expect(page.getByText(/answer structure/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^create question$/i })).toBeVisible();

    const subjectSelect = page.locator('select[name="subject"]').first();
    await expect(subjectSelect).toBeDisabled();

    await page.getByRole("button", { name: /^create question$/i }).click();
    await expect(page.getByText(/^program$/i).first()).toBeVisible();
    await expect(page.getByText(/question text|write the question prompt/i).first()).toBeVisible();
    await expect(page.locator('textarea[name="question_text"]')).toHaveValue("");
  });

  test("@workflow browser coverage keeps institute question-create academic dependencies truthful", async ({
    page,
  }) => {
    await gotoWithRuntimeRecovery(page, "/institute/question-bank/new");
    await expect(page.getByRole("heading", { name: /create question/i }).first()).toBeVisible();

    const programSelect = page.locator('select[name="program"]').first();
    const subjectSelect = page.locator('select[name="subject"]').first();
    const topicSelect = page.locator('select[name="topic"]').first();

    await expect(subjectSelect).toBeDisabled();
    const programValue = await programSelect.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).find((value) => value.trim().length > 0) ?? null,
    );
    expect(programValue).not.toBeNull();
    await programSelect.selectOption(programValue!);

    await expect(subjectSelect).toBeEnabled();
    await expect.poll(async () => subjectSelect.locator("option").count()).toBeGreaterThan(1);

    const subjectValue = await subjectSelect.locator("option").evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).find((value) => value.trim().length > 0) ?? null,
    );
    expect(subjectValue).not.toBeNull();
    await subjectSelect.selectOption(subjectValue!);

    await expect(topicSelect).toBeEnabled();
    await expect.poll(async () => topicSelect.locator("option").count()).toBeGreaterThan(0);
  });

  test("@workflow browser coverage keeps institute duplicate-question prefill truthful", async ({ page }) => {
    const questionHref = await openQuestionDetailHref(page);
    const questionIdMatch = questionHref.match(/\/institute\/question-bank\/([^/?#]+)/);
    const questionId = questionIdMatch?.[1] ?? "";
    expect(questionId).not.toBe("");

    await gotoWithRuntimeRecovery(page, `/institute/question-bank/new?duplicate=${encodeURIComponent(questionId)}`);
    await expect(page.getByRole("heading", { name: /duplicate question/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /create duplicate/i })).toBeVisible();
    await expect(page.locator('textarea[name="question_text"]')).not.toHaveValue("");
    await expect(page.locator('textarea[name="explanation"]')).not.toHaveValue("");
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
  });
});
