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

test.describe("Institute question import mapping browser coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage shows row-level academic mapping failures truthfully", async ({
    page,
  }, testInfo: TestInfo) => {
    await gotoQuestionImport(page);
    test.skip(await expectBlockedState(page), "Question import route is not actionable in this environment.");

    const questionText = `Institute invalid mapping ${Date.now()}`;

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
          preview_signature: "institute-invalid-mapping-preview-001",
          total_rows: 1,
          valid_rows: 0,
          invalid_rows: 1,
          valid_payloads: [],
          rows: [
            {
              row_number: 2,
              is_valid: false,
              errors: [
                "The subject/topic combination does not exist in the current institute academic scope.",
              ],
              error_fields: ["subject", "topic"],
              error_map: {
                subject: ["Use a live subject code from this institute before previewing again."],
                topic: ["The selected topic is not mapped to this subject in the current scope."],
              },
              expectations: ["Use a real subject code", "Match a topic that belongs to that subject"],
              question_text: questionText,
              subject_code: "SUBJECT-CODE",
              topic_code: "TOPIC-CODE",
              question_type: "mcq_single",
              difficulty_level: "foundation",
            },
          ],
        }),
      });
    });

    const filePath = testInfo.outputPath("institute-question-import-invalid-mapping.csv");
    await writeFile(filePath, "question_text\nPlaceholder\n", "utf8");
    await attachQuestionImportFile(page, filePath);

    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    await expect(page.getByText(/preview generated\./i).first()).toContainText(
      /1 row\(s\) still need fixes before final import/i,
    );
    await expect(page.getByText(/preview results/i).first()).toBeVisible();
    await expect(page.getByText(/most common fix areas/i)).toBeVisible();
    await expect(page.getByText(/subject \(1\) • topic \(1\)/i)).toBeVisible();
    await expect(page.getByText(/most repeated row guidance/i)).toBeVisible();
    await expect(page.getByText(/use a real subject code \(1\) • match a topic that belongs to that subject \(1\)/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /import valid rows \(0\)/i })).toBeDisabled();
    await expect(page.getByText(/row 2/i)).toBeVisible();
    await expect(page.getByText(new RegExp(questionText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")).first()).toBeVisible();
    await expect(page.getByText(/fix subject/i)).toBeVisible();
    await expect(page.getByText(/fix topic/i)).toBeVisible();
    await expect(page.getByText(/field-by-field fixes/i)).toBeVisible();
    await expect(page.getByText(/use a live subject code from this institute before previewing again\./i)).toBeVisible();
    await expect(page.getByText(/the selected topic is not mapped to this subject in the current scope\./i)).toBeVisible();
    await expect(
      page.locator(".questionImportErrorList").getByText(
        /the subject\/topic combination does not exist in the current institute academic scope\./i,
      ),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview valid rows$/i) }).getByText("0"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview invalid rows$/i) }).getByText("1"),
    ).toBeVisible();
  });
});
