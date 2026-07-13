import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectSharedLibrarySection(page: Page) {
  await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();

  const section = page.locator("section.contentCard").filter({
    has: page.getByText(/licensed intake shortcut/i).first(),
  }).first();
  await expect(section).toBeVisible();
  await expect(
    section.getByText(/institute admins complete the final intake step from shared library linker/i).first(),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: /open shared library linker/i }).first(),
  ).toBeVisible();

  return section;
}

test.describe("Institute question bank shared library workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can inspect the shared library lane from question bank", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByText(/find questions faster/i).first()).toBeVisible();
    await expect(page.getByText(/licensed intake shortcut/i).first()).toBeVisible();

    const sharedLibrarySection = await expectSharedLibrarySection(page);

    const searchField = page.getByRole("textbox", { name: /search question text/i });
    await searchField.fill("algebra");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/search=algebra/);
    await expect(searchField).toHaveValue("algebra");

    await expectSharedLibrarySection(page);

    await sharedLibrarySection.getByRole("link", { name: /open shared library linker/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/question-bank\/library-linker(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /shared library linker/i }).first()).toBeVisible();
    await expect(page.getByText(/current lane: shared library linker/i).first()).toBeVisible();
    await expect(page.getByText(/this page is not for editing wording/i).first()).toBeVisible();
    await expect(page.getByText(/role boundary for this lane/i).first()).toBeVisible();
    await expect(
      page.getByText(/teachers can inspect licensed source rows and request help from their workspace, but they do not complete the final link on this page/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/pick one class and one subject first/i).first()).toBeVisible();
  });
});
