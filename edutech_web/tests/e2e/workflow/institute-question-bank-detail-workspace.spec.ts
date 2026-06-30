import { expect, test } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

test.describe("Institute question bank detail routes", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can open question detail and comprehension detail routes from the question bank", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const editLink = page.getByRole("link", { name: /edit|duplicate to edit/i }).first();
    await expect(editLink).toBeVisible();
    await editLink.click();

    await expect(page).toHaveURL(/\/institute\/question-bank\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question|duplicate question/i }).first()).toBeVisible();
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
    await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
    await expect(page.getByText(/answer structure/i).first()).toBeVisible();

    await page.goto("/institute/question-bank");

    const openSetLink = page.getByRole("link", { name: /open set/i }).first();
    if (await openSetLink.isVisible().catch(() => false)) {
      await openSetLink.click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(/next step/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to question bank|back to bank/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /create linked question/i }).first()).toBeVisible();
    }
  });
});
