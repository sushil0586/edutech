import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoTeacherQuestionBank(page: Page, href = "/teacher/question-bank") {
  await gotoWithRuntimeRecovery(page, href);
  await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
  await expect(page.getByText(/find questions faster/i).first()).toBeVisible();
}

async function applyQuestionBankContinuityFilters(page: Page) {
  await page.getByRole("textbox", { name: /search question text/i }).fill("square root");
  await page.locator('select[name="ordering"]').first().selectOption("-usage_count");
  await page.getByRole("button", { name: /apply filters|update view/i }).click();
}

async function expectQuestionBankContinuityFilters(page: Page) {
  await expect(page).toHaveURL(/search=square(\+|%20)root/);
  await expect(page).toHaveURL(/ordering=-usage_count|ordering=%2Dusage_count/);
  await expect(page.getByRole("textbox", { name: /search question text/i })).toHaveValue("square root");
  await expect(page.locator('select[name="ordering"]').first()).toHaveValue("-usage_count");
}

test.describe("Teacher question bank continuity", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher question-bank filters and details survive refresh and revisit", async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherQuestionBank(page);
    await applyQuestionBankContinuityFilters(page);
    await expectQuestionBankContinuityFilters(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expectQuestionBankContinuityFilters(page);

    const details = page.locator("details.questionBankDetails").first();
    const hasVisibleDetails = await details.isVisible().catch(() => false);

    if (hasVisibleDetails) {
      await details.locator("summary").click();
      await expect(details).toHaveAttribute("open", "");
      await expect(
        details.getByText(/explanation|accepted answers|answer options|student response format/i).first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText(/no questions match these filters|no shared library questions match this scope/i).first(),
      ).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/teacher/search?q=exam");
    await expect(page.getByRole("heading", { name: /^search$/i }).first()).toBeVisible();

    await page.goBack();
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expectQuestionBankContinuityFilters(page);

    if (hasVisibleDetails) {
      await expect(details).toHaveAttribute("open", "");
    }

    await page.getByRole("button", { name: /^reset$/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("textbox", { name: /search question text/i })).toHaveValue("");
  });
});
