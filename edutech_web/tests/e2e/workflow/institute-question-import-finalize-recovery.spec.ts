import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function fileInput(page: Page) {
  return page.getByTestId("question-import-file-input");
}

async function gotoQuestionImport(page: Page) {
  await page.goto("/institute/question-bank/import");
  await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
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

test.describe("Institute question import finalize recovery", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute shows partial-success finalize recovery for question import", async ({
    page,
  }, testInfo: TestInfo) => {
    await gotoQuestionImport(page);
    test.skip(await expectBlockedState(page), "Question import route is not actionable in this environment.");

    const createdQuestionText = `Institute finalize recovery created ${Date.now()}`;
    const blockedQuestionText = `Institute finalize recovery blocked ${Date.now()}`;

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
          preview_signature: "institute-finalize-recovery-preview-001",
          total_rows: 2,
          valid_rows: 2,
          invalid_rows: 0,
          rows: [
            {
              row_number: 2,
              is_valid: true,
              errors: [],
              error_fields: [],
              error_map: {},
              question_text: createdQuestionText,
              subject_code: "SCI",
              topic_code: "MOTION",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
            {
              row_number: 3,
              is_valid: true,
              errors: [],
              error_fields: [],
              error_map: {},
              question_text: blockedQuestionText,
              subject_code: "SCI",
              topic_code: "MOTION",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
          ],
          valid_payloads: [
            { question_text: createdQuestionText },
            { question_text: blockedQuestionText },
          ],
        }),
      });
    });

    await page.route("**/api/question-bank/finalize-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          created_count: 1,
          failed_count: 1,
          created_ids: [],
          failures: [
            {
              row_number: 3,
              question_text: blockedQuestionText,
              errors: {
                detail: [
                  "A matching question was created after preview. Preview the CSV again before retrying.",
                ],
              },
            },
          ],
        }),
      });
    });

    const filePath = testInfo.outputPath("institute-question-import-finalize-recovery.csv");
    await writeFile(filePath, "question_text\nPlaceholder\n", "utf8");
    await attachQuestionImportFile(page, filePath);

    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    await expect(page.getByText(/preview generated\./i).first()).toContainText(
      /all rows are valid and ready for final import/i,
    );
    await expect(page.getByRole("button", { name: /import valid rows \(2\)/i })).toBeEnabled();

    await page.getByRole("button", { name: /import valid rows \(2\)/i }).click();

    await expect(
      page.getByText(/1 questions were imported\. 1 row\(s\) are still blocked after final import\./i).first(),
    ).toBeVisible();
    await expect(page.getByText(/^finalize recovery$/i)).toBeVisible();
    await expect(page.getByText(/what imported vs what is blocked/i)).toBeVisible();
    await expect(page.getByText(/1 row\(s\) were created\. 1 row\(s\) stayed blocked\./i)).toBeVisible();
    await expect(
      page.getByText(new RegExp(blockedQuestionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first(),
    ).toBeVisible();
    await expect(
      page.locator(".questionImportErrorList li").filter({
        hasText: /preview the csv again before retrying/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/preview results/i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeDisabled();
  });
});
