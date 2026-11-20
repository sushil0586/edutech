import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";

async function selectFirstNonEmptyOption(locator: import("@playwright/test").Locator) {
  const value = await locator.locator("option").evaluateAll((options) =>
    options
      .map((option) => (option as HTMLOptionElement).value)
      .find((optionValue) => optionValue.trim().length > 0) ?? null,
  );
  expect(value).not.toBeNull();
  await locator.selectOption(value!);
}

test.describe("Teacher workflow deep regression", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can work through question bank, comprehension authoring, and import validation", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await page.goto("/teacher/question-bank");

    await page.getByRole("textbox", { name: /search question text/i }).fill("square root");
    await page.getByRole("button", { name: /update view/i }).click();

    await expect(page).toHaveURL(/search=square\+root|search=square%20root/);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("textbox", { name: /search question text/i })).toHaveValue("square root");
    await expect(page.getByText(/search: active/i)).toBeVisible();

    const emptyState = page
      .getByText(/no questions match these filters|no shared library questions match this scope/i)
      .first();
    await expect
      .poll(async () =>
        (await page.locator("details.questionBankDetails").count()) > 0 ||
        (await emptyState.isVisible().catch(() => false)),
      )
      .toBe(true);

    const details = page.locator("details.questionBankDetails").first();
    if ((await page.locator("details.questionBankDetails").count()) > 0) {
      await expect(details).not.toHaveAttribute("open", "");

      await expect(async () => {
        const currentDetails = page.locator("details.questionBankDetails").first();
        await expect(currentDetails.locator("summary").first()).toBeVisible();
        await currentDetails.locator("summary").first().click({ force: true });
        await expect(currentDetails).toHaveAttribute("open", "");
      }).toPass({ timeout: 15000 });
      const openedDetails = page.locator("details.questionBankDetails[open]").first();
      await expect(
        openedDetails.getByText(/explanation|accepted answers|answer options|student response format/i).first(),
      ).toBeVisible();

      await openedDetails.locator("summary").first().click({ force: true });
      await expect(page.locator("details.questionBankDetails").first()).not.toHaveAttribute("open", "");
    } else {
      await expect(emptyState).toBeVisible();
    }

    await page.goto("/teacher/question-bank/import");
    await expect(page.getByRole("heading", { name: /import questions/i }).first()).toBeVisible();
    const importBlockedMessage = page
      .getByText(/question-bank bulk import is not enabled for your institute yet/i)
      .first();
    await expect
      .poll(async () =>
        (await importBlockedMessage.isVisible().catch(() => false)) ||
        (await page.getByRole("button", { name: /preview import/i }).isVisible().catch(() => false)),
      )
      .toBe(true);
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

    await selectFirstNonEmptyOption(programSelect);
    await expect(subjectSelect).toBeEnabled();
    await selectFirstNonEmptyOption(subjectSelect);
    await expect(topicSelect).toBeEnabled();

    await expect(page.getByText(/no linked questions yet/i)).toBeVisible();

    await page.goto("/teacher/question-bank/comprehension/import");
    await expect(page.getByRole("heading", { name: /import comprehension sets/i }).first()).toBeVisible();
    const comprehensionBlockedMessage = page
      .getByText(/question-bank bulk import is not enabled for your institute yet/i)
      .first();
    await expect
      .poll(async () =>
        (await comprehensionBlockedMessage.isVisible().catch(() => false)) ||
        (await page.getByRole("button", { name: /preview import/i }).isVisible().catch(() => false)),
      )
      .toBe(true);
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
