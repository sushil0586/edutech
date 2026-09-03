import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function expectPageWithoutHorizontalSpill(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(
    Math.max(overflow.documentWidth, overflow.bodyWidth),
    `${label} should not spill horizontally (viewport=${overflow.viewportWidth}, document=${overflow.documentWidth}, body=${overflow.bodyWidth})`,
  ).toBeLessThanOrEqual(overflow.viewportWidth + 2);
}

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

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const editLink = page.getByRole("link", { name: /edit|duplicate to edit/i }).first();
    await expect(editLink).toBeVisible();
    await editLink.click();

    await expect(page).toHaveURL(/\/institute\/question-bank\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question|duplicate question/i }).first()).toBeVisible();
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
    await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
    await expect(page.getByText(/answer structure/i).first()).toBeVisible();
    await expect(page.locator('a[href="/institute/question-bank"]').first()).toBeVisible();
    await expect(page.getByLabel(/question text/i)).toBeVisible();
    await expect(page.getByLabel(/explanation/i)).toBeVisible();
    await expect(page.getByLabel(/default marks/i)).toBeVisible();
    await expect(page.getByLabel(/negative marks/i)).toBeVisible();
    await expectPageWithoutHorizontalSpill(page, "Institute question detail workspace");

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");

    const openSetLink = page.getByRole("link", { name: /open set/i }).first();
    if (await openSetLink.isVisible().catch(() => false)) {
      await openSetLink.click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByText(/next step/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to question bank|back to bank/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /create linked question/i }).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute comprehension detail workspace");
    }
  });
});
