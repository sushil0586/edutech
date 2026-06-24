import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute question bank bulk actions", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can validate bulk question action guards", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const bulkBar = page.locator("form.questionBankBulkBar").first();
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar.getByText(/select one or more visible questions to unlock bulk updates/i)).toBeVisible();

    const setDifficultyButton = bulkBar.getByRole("button", { name: /set difficulty/i });
    const changeTopicButton = bulkBar.getByRole("button", { name: /change topic/i });
    const attachTagButton = bulkBar.getByRole("button", { name: /attach tag/i });
    const deleteSelectedButton = bulkBar.getByRole("button", { name: /delete selected/i });

    await expect(setDifficultyButton).toBeDisabled();
    await expect(changeTopicButton).toBeDisabled();
    await expect(attachTagButton).toBeDisabled();
    await expect(deleteSelectedButton).toBeDisabled();

    await bulkBar.getByLabel(/select visible questions/i).check();
    await expect(bulkBar.getByText(/selected from the current visible list/i)).toBeVisible();
    await expect(setDifficultyButton).toBeEnabled();
    await expect(changeTopicButton).toBeEnabled();
    await expect(attachTagButton).toBeEnabled();

    await setDifficultyButton.click();
    await expect(page).toHaveURL(/\/institute\/question-bank\?error=/);
    await expect(page.getByText(/choose a difficulty before running the bulk update/i).first()).toBeVisible();

    await page.goto("/institute/question-bank");
    await bulkBar.getByLabel(/select visible questions/i).check();
    await changeTopicButton.click();
    await expect(page).toHaveURL(/\/institute\/question-bank\?error=/);
    await expect(page.getByText(/choose a topic before running the bulk update/i).first()).toBeVisible();

    await page.goto("/institute/question-bank");
    await bulkBar.getByLabel(/select visible questions/i).check();
    await attachTagButton.click();
    await expect(page).toHaveURL(/\/institute\/question-bank\?error=/);
    await expect(page.getByText(/choose a tag before running the bulk tag action/i).first()).toBeVisible();
  });
});
