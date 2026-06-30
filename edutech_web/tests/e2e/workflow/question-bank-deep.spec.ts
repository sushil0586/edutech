import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

test.describe("Teacher workflow deep regression", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can work through question bank, comprehension authoring, and import validation", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await page.goto("/teacher/question-bank");

    await page.getByRole("textbox", { name: /search question text/i }).fill("square root");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=square\+root|search=square%20root/);
    await expect(page.getByRole("textbox", { name: /search question text/i })).toHaveValue("square root");
    await expect(page.getByText(/search: active/i)).toBeVisible();

    const details = page.locator("details.questionBankDetails").first();
    await expect(details.locator("summary")).toBeVisible();
    await expect(details).not.toHaveAttribute("open", "");

    await details.locator("summary").click();
    await expect(details).toHaveAttribute("open", "");
    await expect(
      details.getByText(/explanation|accepted answers|answer options|student response format/i).first(),
    ).toBeVisible();

    await details.locator("summary").click();
    await expect(details).not.toHaveAttribute("open", "");

    await page.goto("/teacher/question-bank/import");
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    const importBlocked = await page
      .getByText(/question-bank bulk import is not enabled for your institute yet/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (!importBlocked) {
      await expect(page.getByText(/expected csv headers/i)).toBeVisible();
      await expect(page.getByText(/single correct mcq/i)).toBeVisible();

      await page.getByRole("button", { name: /preview import/i }).click();
      await expect(page.locator(".feedbackBannerError")).toContainText(
        /choose a csv file before previewing the import/i,
      );

      const fileInput = page.getByTestId("question-import-file-input");
      await fileInput.setInputFiles({
        name: "question-import-placeholder.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("question_text\nplaceholder\n"),
      });

      const clearButton = page.getByRole("button", { name: /^clear$/i });
      await expect(clearButton).toBeEnabled();

      await clearButton.click();
      await expect(page.locator(".feedbackBannerError")).not.toBeVisible();
      await expect(clearButton).toBeDisabled();
    } else {
      await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
      await expect(page.getByText(/subscription controlled/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to question bank/i })).toBeVisible();
    }

    await page.goto("/teacher/question-bank/comprehension/new");
    await expect(page.getByRole("heading", { name: /create comprehension set/i }).first()).toBeVisible();

    const programSelect = page.locator('select[name="program"]');
    const subjectSelect = page.locator('select[name="subject"]');
    const topicSelect = page.locator('select[name="topic"]');

    await expect(subjectSelect).toBeDisabled();
    await expect(topicSelect).toBeDisabled();

    await programSelect.selectOption({ label: "Class 7" });
    await expect(subjectSelect).toBeEnabled();
    await subjectSelect.selectOption({ label: "Math" });
    await expect(topicSelect).toBeEnabled();

    await expect(page.getByText(/no linked questions yet/i)).toBeVisible();

    await page.goto("/teacher/question-bank/comprehension/import");
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
    const comprehensionImportBlocked = await page
      .getByText(/question-bank bulk import is not enabled for your institute yet/i)
      .first()
      .isVisible()
      .catch(() => false);

    if (!comprehensionImportBlocked) {
      await expect(page.getByText(/expected csv headers/i)).toBeVisible();
      await expect(page.getByText(/markdown passage/i)).toBeVisible();

      await page.getByRole("button", { name: /preview import/i }).click();
      await expect(page.locator(".feedbackBannerError")).toContainText(
        /choose a csv file before previewing the import/i,
      );
    } else {
      await expect(page.getByText(/feature entitlement required/i).first()).toBeVisible();
      await expect(page.getByText(/subscription controlled/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to question bank/i })).toBeVisible();
    }
  });
});
