import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function gotoTeacherComprehensionImport(page: Page) {
  await gotoWithRuntimeRecovery(page, "/teacher/question-bank/comprehension/import");
  await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
}

async function expectBlockedState(page: Page) {
  await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
  await expect(
    page.getByText(/question-bank bulk import is not enabled for your institute yet/i).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /back to question bank/i })).toHaveAttribute(
    "href",
    "/teacher/question-bank",
  );
}

test.describe("Teacher comprehension import browser coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow browser coverage keeps teacher comprehension import controls and validation truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoTeacherComprehensionImport(page);

    const pageText = await page.locator("body").innerText();
    if (/question-bank bulk import is not enabled for your institute yet/i.test(pageText)) {
      await expectBlockedState(page);
      return;
    }

    await expect(page.getByText(/^template columns$/i).first()).toBeVisible();
    await expect(page.getByText(/^preview valid rows$/i).first()).toBeVisible();
    await expect(page.getByText(/^preview invalid rows$/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /download template/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /view bank/i })).toHaveAttribute(
      "href",
      "/teacher/question-bank",
    );
    await expect(page.getByText(/expected csv headers/i).first()).toBeVisible();
    await expect(page.getByText(/before using a sample/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /download sample/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /preview import/i }).click();
    await expect(page.getByText(/choose a csv file before previewing the import/i).first()).toBeVisible();

    const fileInput = page.getByTestId("question-passage-import-file-input");
    await fileInput.setInputFiles({
      name: "teacher-comprehension-invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          "subject,topic,title,content_format,passage_text,description",
          "BAD-SUBJECT,BAD-TOPIC,Playwright Invalid Passage,markdown_latex,Sample passage for invalid preview,Invalid academic mapping",
        ].join("\n"),
      ),
    });

    await expect(page.getByRole("button", { name: /clear/i })).toBeEnabled();
    await page.getByRole("button", { name: /preview import/i }).click();

    const previewResults = page.getByText(/preview results/i).first();
    const backendError = page.locator(".feedbackBannerError").first();

    await expect
      .poll(async () => {
        if (await previewResults.isVisible().catch(() => false)) {
          return "preview";
        }
        if (await backendError.isVisible().catch(() => false)) {
          return "error";
        }
        return "pending";
      })
      .not.toBe("pending");

    if (await previewResults.isVisible().catch(() => false)) {
      await expect(previewResults).toBeVisible();
      await expect(page.getByRole("button", { name: /import valid rows/i })).toBeVisible();
    } else {
      await expect(backendError).toBeVisible();
    }

    await page.getByRole("button", { name: /clear/i }).click();
    await expect(fileInput).toHaveValue("");
    await expect(previewResults).toHaveCount(0);
  });
});
