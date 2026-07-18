import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

function fileInput(page: Page) {
  return page.getByTestId("question-import-file-input");
}

async function gotoQuestionImport(page: Page) {
  await page.goto("/teacher/question-bank/import");
  await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
}

async function attachQuestionImportFile(page: Page, filePath: string) {
  const input = fileInput(page);
  await expect(input).toBeVisible();
  await input.setInputFiles(filePath);
  await expect
    .poll(async () =>
      input.evaluate((element) => (element as HTMLInputElement).files?.length ?? 0),
    )
    .toBe(1);
  await input.dispatchEvent("input");
  await input.dispatchEvent("change");
}

async function expectBlockedState(page: Page) {
  const bodyText = await page.locator("body").innerText();
  if (!/question-bank bulk import is not enabled for (your|this) institute yet/i.test(bodyText)) {
    return false;
  }

  await expect(page.getByText(/feature entitlement required/i)).toBeVisible();
  await expect(page.getByText(/subscription controlled/i)).toBeVisible();
  return true;
}

test.describe("Teacher question import browser coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);
  });

  test("@workflow browser coverage previews mixed teacher question rows truthfully", async ({
    page,
  }, testInfo: TestInfo) => {
    await gotoQuestionImport(page);
    test.skip(await expectBlockedState(page), "Question import route is not actionable in this environment.");

    const duplicateQuestionText = `Teacher duplicate preview ${Date.now()}`;

    await page.route("**/api/question-bank/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preview_schema_version: 1,
          preview_signature: "teacher-duplicate-preview-001",
          total_rows: 2,
          valid_rows: 1,
          invalid_rows: 1,
          valid_payloads: [
            {
              question_text: duplicateQuestionText,
            },
          ],
          rows: [
            {
              row_number: 2,
              is_valid: true,
              errors: [],
              error_fields: [],
              error_map: {},
              expectations: ["Question text", "Academic mapping", "Correct answer"],
              question_text: duplicateQuestionText,
              subject_code: "MATH",
              topic_code: "LINEAR-EQ",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
            {
              row_number: 3,
              is_valid: false,
              errors: ["Duplicate question already exists in this academic scope."],
              error_fields: ["question_text"],
              error_map: {
                question_text: ["Duplicate question already exists in this academic scope."],
              },
              expectations: ["Use unique question text for this subject and topic"],
              question_text: duplicateQuestionText,
              subject_code: "MATH",
              topic_code: "LINEAR-EQ",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
          ],
        }),
      });
    });

    const filePath = testInfo.outputPath("teacher-question-import-mixed.csv");
    await writeFile(filePath, "question_text\nPlaceholder\n", "utf8");

    await attachQuestionImportFile(page, filePath);
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();

    await page.getByRole("button", { name: /preview import/i }).click();

    await expect(page.getByText(/preview generated\./i).first()).toContainText(
      /1 row\(s\) still need fixes before final import/i,
    );
    await expect(page.getByText(/preview results/i).first()).toBeVisible();
    await expect(page.getByText(/some rows can proceed now, some are blocked/i)).toBeVisible();
    await expect(page.getByText(/1 valid row\(s\) can still be finalized from this preview\./i)).toBeVisible();
    await expect(page.getByText(/duplicate rows need attention first/i)).toBeVisible();
    await expect(page.getByText(/any remaining valid rows can still proceed\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /import valid rows \(1\)/i })).toBeEnabled();
    await expect(page.getByText(/row 2/i)).toBeVisible();
    await expect(page.getByText(/row 3/i)).toBeVisible();
    await expect(
      page.getByText(new RegExp(duplicateQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
    ).toBeVisible();
    await expect(
      page.locator(".questionImportFixPanel, .questionImportErrorList").getByText(
        /duplicate question already exists in this academic scope/i,
      ).first(),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview valid rows$/i) }).getByText("1"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview invalid rows$/i) }).getByText("1"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Duplicate risk rows$/i) }).getByText("1"),
    ).toBeVisible();
  });
});
