import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function fileInput(page: Page) {
  return page.getByTestId("question-passage-import-file-input");
}

async function gotoComprehensionImport(page: Page) {
  await page.goto("/institute/question-bank/comprehension/import");
  await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
}

async function expectBlockedOrLoadIssue(page: Page) {
  const bodyText = await page.locator("body").innerText();
  if (/question-bank bulk import is not enabled for this institute yet/i.test(bodyText)) {
    await expect(page.getByText(/feature entitlement required/i)).toBeVisible();
    return "blocked";
  }
  if (/comprehension import workspace could not be loaded/i.test(bodyText)) {
    await expect(page.getByText(/load issue/i)).toBeVisible();
    return "load-issue";
  }
  return null;
}

test.describe("Institute comprehension import browser coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage previews mixed institute comprehension rows truthfully", async ({
    page,
  }) => {
    await gotoComprehensionImport(page);
    const blockedReason = await expectBlockedOrLoadIssue(page);
    test.skip(Boolean(blockedReason), `Comprehension import route is not actionable in this environment: ${blockedReason}`);

    await page.route("**/api/question-bank/comprehension/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preview_schema_version: "2026-07-12",
          preview_signature: "preview-mixed-001",
          valid_rows: 1,
          invalid_rows: 1,
          valid_payloads: [
            {
              row_number: 2,
              title: "River Basin Reading Set",
            },
          ],
          rows: [
            {
              row_number: 2,
              title: "River Basin Reading Set",
              subject_code: "SCI-07",
              topic_code: "WATER-CYCLE",
              content_format: "markdown_latex",
              is_valid: true,
              error_fields: [],
              error_map: {},
              errors: [],
              expectations: ["Passage title", "Passage text", "Academic mapping"],
            },
            {
              row_number: 3,
              title: "River Basin Reading Set",
              subject_code: "SCI-07",
              topic_code: "WATER-CYCLE",
              content_format: "markdown_latex",
              is_valid: false,
              error_fields: ["title"],
              error_map: {
                title: ["Duplicate comprehension title already exists in this academic scope."],
              },
              errors: ["Duplicate comprehension title already exists in this academic scope."],
              expectations: ["Use a unique title inside the same academic scope"],
            },
          ],
        }),
      });
    });

    await fileInput(page).setInputFiles({
      name: "institute-comprehension-import-mixed.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,passage_text\nRiver Basin Reading Set,Placeholder\n", "utf8"),
    });

    await page.getByRole("button", { name: /preview import/i }).click();

    await expect(page.getByText(/preview generated\./i).first()).toContainText(
      /1 comprehension row\(s\) still need fixes before final import/i,
    );
    await expect(page.getByText(/preview results/i).first()).toBeVisible();
    await expect(page.getByText(/duplicate comprehension titles need attention first/i)).toBeVisible();
    await expect(page.getByText(/1 comprehension rows are ready to import/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /import valid rows \(1\)/i })).toBeEnabled();
    await expect(page.getByText(/row 2/i)).toBeVisible();
    await expect(page.getByText(/row 3/i)).toBeVisible();
    await expect(
      page.locator(".questionImportFixPanel, .questionImportErrorList").getByText(
        /duplicate comprehension title already exists in this academic scope/i,
      ).first(),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview valid rows$/i) }).getByText("1"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview invalid rows$/i) }).getByText("1"),
    ).toBeVisible();
  });

  test("@workflow browser coverage finalizes institute comprehension import and clears preview state", async ({
    page,
  }) => {
    await gotoComprehensionImport(page);
    const blockedReason = await expectBlockedOrLoadIssue(page);
    test.skip(Boolean(blockedReason), `Comprehension import route is not actionable in this environment: ${blockedReason}`);

    await page.route("**/api/question-bank/comprehension/preview-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          preview_schema_version: "2026-07-12",
          preview_signature: "preview-valid-001",
          valid_rows: 2,
          invalid_rows: 0,
          valid_payloads: [
            { row_number: 2, title: "Plate Motion Primer" },
            { row_number: 3, title: "Monsoon Wind Patterns" },
          ],
          rows: [
            {
              row_number: 2,
              title: "Plate Motion Primer",
              subject_code: "GEO-08",
              topic_code: "PLATE-TECTONICS",
              content_format: "markdown_latex",
              is_valid: true,
              error_fields: [],
              error_map: {},
              errors: [],
              expectations: [],
            },
            {
              row_number: 3,
              title: "Monsoon Wind Patterns",
              subject_code: "GEO-08",
              topic_code: "WEATHER-CLIMATE",
              content_format: "markdown_latex",
              is_valid: true,
              error_fields: [],
              error_map: {},
              errors: [],
              expectations: [],
            },
          ],
        }),
      });
    });

    await page.route("**/api/question-bank/comprehension/finalize-import", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          created_count: 2,
          failed_count: 0,
        }),
      });
    });

    await fileInput(page).setInputFiles({
      name: "institute-comprehension-import-valid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("title,passage_text\nPlate Motion Primer,Placeholder\n", "utf8"),
    });

    await page.getByRole("button", { name: /preview import/i }).click();
    await expect(page.getByText(/all comprehension rows are valid and ready for final import/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /import valid rows \(2\)/i })).toBeEnabled();

    await page.getByRole("button", { name: /import valid rows \(2\)/i }).click();

    await expect(page.getByText(/2 comprehension set\(s\) were imported into the question bank/i)).toBeVisible();
    await expect(page.getByText(/preview results/i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^clear$/i })).toBeDisabled();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview valid rows$/i) }).getByText("0"),
    ).toBeVisible();
    await expect(
      page.locator(".builderSummaryCard").filter({ has: page.getByText(/^Preview invalid rows$/i) }).getByText("0"),
    ).toBeVisible();
  });
});
