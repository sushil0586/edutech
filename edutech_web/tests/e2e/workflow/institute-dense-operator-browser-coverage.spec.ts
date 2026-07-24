import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

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

async function expectLocatorsWithoutHorizontalSpill(
  page: Page,
  selector: string,
  label: string,
  sampleSize = 6,
) {
  const locators = page.locator(selector);
  const count = await locators.count();
  const limit = Math.min(count, sampleSize);
  for (let index = 0; index < limit; index += 1) {
    const locator = locators.nth(index);
    await expect(locator, `${label} ${index + 1} should be visible`).toBeVisible();
    const overflow = await locator.evaluate((element) => ({
      clientWidth: (element as HTMLElement).clientWidth,
      scrollWidth: (element as HTMLElement).scrollWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${label} ${index + 1} should not overflow horizontally (client=${overflow.clientWidth}, scroll=${overflow.scrollWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 2);
  }
}

test.describe("Institute dense operator browser coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test("@workflow institute live monitor keeps dense controls and detail handoff browser-truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results/live");
    await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /live monitor is useful only during active exam windows/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute live monitor empty state");
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      return;
    }

    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
    await expect(page.getByText(/live monitor refresh/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();

    await expectPageWithoutHorizontalSpill(page, "Institute live monitor");
    await expectLocatorsWithoutHorizontalSpill(page, ".studentResultsTableRow", "Institute live monitor row", 4);

    const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt|review|inspect/i }).first();
    if (await inspectAttemptLink.isVisible().catch(() => false)) {
      await inspectAttemptLink.click();
      await expect
        .poll(() => page.url(), {
          message: "Expected institute live-monitor handoff to open either the review queue or attempt detail.",
          timeout: 10000,
        })
        .toMatch(/\/institute\/(results\/live\?[^#]*attempt=|reviews(?:\?.*)?$)/);
      const currentUrl = page.url();
      if (/\/institute\/reviews(?:\?.*)?$/i.test(currentUrl)) {
        await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
        await expect(page.getByText(/review queue|pending review|reviewed/i).first()).toBeVisible();
        await expectPageWithoutHorizontalSpill(page, "Institute reviews handoff from live monitor");
      } else {
        await expect(page).toHaveURL(/\/institute\/results\/live\?[^#]*attempt=/);
        await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
        await expect(page.getByText(/decision support|intervention notes/i).first()).toBeVisible();
        await expectPageWithoutHorizontalSpill(page, "Institute live monitor attempt detail");
      }
    } else {
      await expect(
        page.getByText(/no attempts currently need intervention beyond routine monitoring/i).first(),
      ).toBeVisible();
    }
  });

  test("@workflow institute exam detail keeps dense readiness and delivery panels browser-truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();

    const emptyStateHeading = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute exams empty state");
      return;
    }

    await page.getByRole("link", { name: /open exam/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);

    await expect(page.getByText(/^exam code$/i).first()).toBeVisible();
    await expect(page.getByText(/^questions$/i).first()).toBeVisible();
    await expect(page.getByText(/^assigned students$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^hard blockers$/i).first()).toBeVisible();
    await expect(page.getByText(/^still pending$/i).first()).toBeVisible();
    await expect(page.getByText(/^already ready$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
    await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();

    await expectPageWithoutHorizontalSpill(page, "Institute exam detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".metricCard, .contentCard", "Institute exam detail dense card", 8);
  });

  test("@workflow institute question detail keeps editor and support panels browser-truthful", async ({
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

    await expectPageWithoutHorizontalSpill(page, "Institute question detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".contentCard, .fieldStack", "Institute question detail dense surface", 10);
  });
});
