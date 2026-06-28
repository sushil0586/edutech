import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

async function expectSharedLibrarySection(page: Page) {
  await expect(page.getByRole("heading", { name: /shared platform library/i })).toBeVisible();

  const section = page.locator("section.contentCard").filter({
    has: page.getByRole("heading", { name: /shared platform library/i }),
  }).first();
  await expect(section).toBeVisible();

  const cards = section.locator(".questionBankCard");
  const cardCount = await cards.count();

  if (cardCount > 0) {
    await expect(cards.first()).toBeVisible();
    await expect(
      section.getByText(
        /access available|subscription required|request pending|scope mismatch|already linked/i,
      ).first(),
    ).toBeVisible();
    await expect(section.getByRole("button", { name: /link to local bank/i })).toHaveCount(0);
  } else {
    await expect(
      section.getByText(/no shared library questions match this scope/i).first(),
    ).toBeVisible();
  }
}

test.describe("Teacher question bank shared library workspace", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher can inspect the shared library lane from question bank", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i)).toBeVisible();

    await expectSharedLibrarySection(page);

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill("algebra");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=algebra/);
    await expect(searchField).toHaveValue("algebra");
    await expect(page.getByText(/search: active/i)).toBeVisible();

    await expectSharedLibrarySection(page);
  });
});
