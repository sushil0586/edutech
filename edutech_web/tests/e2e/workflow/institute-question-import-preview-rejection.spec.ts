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

test.describe("Institute question import preview rejection", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow institute keeps malformed question-import preview rejection visible and retryable", async ({
    page,
  }, testInfo: TestInfo) => {
    await gotoQuestionImport(page);
    test.skip(await expectBlockedState(page), "Question import route is not actionable in this environment.");

    await page.route("**/api/question-bank/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Missing required columns: subject, topic, question_type, difficulty_level.",
          file: [
            "Download the live template and restore the missing required columns before previewing again.",
          ],
        }),
      });
    });

    const filePath = testInfo.outputPath("institute-question-import-malformed.csv");
    await writeFile(filePath, "question_text\nWrong columns only\n", "utf8");
    await attachQuestionImportFile(page, filePath);

    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    await expect(page.locator(".feedbackBannerError").first()).toContainText(
      /missing required columns: subject, topic, question_type, difficulty_level\./i,
    );
    await expect(
      page.getByText(
        /download the live template and restore the missing required columns before previewing again\./i,
      ),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /preview import/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeEnabled();
    await expect(page.getByText(/preview results/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /import valid rows/i })).toHaveCount(0);
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview valid rows$/i) }).getByText("0"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview invalid rows$/i) }).getByText("0"),
    ).toBeVisible();
  });
});
