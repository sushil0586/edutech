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

async function resolveInstituteQuestionDetailHref(page: Page) {
  const href = await page.locator("a").evaluateAll((anchors) => {
    const match = anchors
      .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
      .find((candidate) => /^\/institute\/question-bank\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
    return match ?? null;
  });

  expect(href, "Expected at least one institute question detail link on the question-bank page.").toBeTruthy();
  return href!;
}

test.describe("Institute mobile question-bank detail continuity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute mobile viewport can open question detail routes and return to the bank cleanly", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    await expect(page.getByTestId("question-bank-filter-form")).toBeVisible();
    await expectPageWithoutHorizontalSpill(page, "Institute mobile question bank workspace");

    const detailHref = await resolveInstituteQuestionDetailHref(page);
    await gotoWithRuntimeRecovery(page, detailHref);

    await expect(page).toHaveURL(/\/institute\/question-bank\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question/i }).first()).toBeVisible();
    await expect(page.getByText(/question identity/i).first()).toBeVisible();
    await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
    await expect(page.getByText(/answer structure/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /attach tag/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /upload attachment/i })).toBeVisible();
    await expect(page.getByLabel(/add tag/i)).toBeVisible();
    await expect(page.getByLabel(/attachment title/i)).toBeVisible();
    await expect(page.getByLabel(/attachment type/i)).toBeVisible();
    await expectPageWithoutHorizontalSpill(page, "Institute mobile question detail workspace");

    const backToBank = page.getByRole("link", { name: /back to question bank|back to bank/i }).first();
    await expect(backToBank).toBeVisible();
    await backToBank.click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const openSetLink = page.getByRole("link", { name: /open set/i }).first();
    if (await openSetLink.isVisible().catch(() => false)) {
      await openSetLink.click();
      await expect(page).toHaveURL(/\/institute\/question-bank\/comprehension\/[^/?#]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /edit comprehension set/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to question bank|back to bank/i }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /create linked question/i }).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile comprehension detail workspace");

      await page.goBack();
      await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    }
  });
});
