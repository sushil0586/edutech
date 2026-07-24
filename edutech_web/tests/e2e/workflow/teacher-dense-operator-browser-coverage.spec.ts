import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectTeacherWorkspace } from "../helpers/navigation";

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

async function resolveTeacherQuestionDetailHref(page: Page) {
  const href = await page.locator("a").evaluateAll((anchors) => {
    const match = anchors
      .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
      .find((candidate) => /^\/teacher\/question-bank\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
    return match ?? null;
  });
  expect(href, "Expected at least one teacher question detail link on the question-bank page.").toBeTruthy();
  return href!;
}

test.describe("Teacher dense operator browser coverage", () => {
  test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

  test("@workflow teacher live monitor keeps dense controls and detail handoff browser-truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/results/live");
    await expect(page).toHaveURL(/\/teacher\/results\/live(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();
    await expect(page.getByText(/live monitor refresh/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();

    await expectPageWithoutHorizontalSpill(page, "Teacher live monitor");
    await expectLocatorsWithoutHorizontalSpill(page, ".studentResultsTableRow", "Teacher live monitor row", 4);

    const inspectAttemptLink = page.getByRole("link", { name: /inspect attempt|review|inspect/i }).first();
    if (await inspectAttemptLink.isVisible().catch(() => false)) {
      await inspectAttemptLink.click();
      await expect
        .poll(() => page.url(), {
          message: "Expected teacher live-monitor handoff to open either the review queue or attempt detail.",
          timeout: 10000,
        })
        .toMatch(/\/teacher\/(results\/live\?[^#]*attempt=|reviews(?:\?.*)?$)/);
      const currentUrl = page.url();
      if (/\/teacher\/reviews(?:\?.*)?$/i.test(currentUrl)) {
        await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
        await expect(page.getByText(/review queue|pending review|reviewed/i).first()).toBeVisible();
        await expectPageWithoutHorizontalSpill(page, "Teacher reviews handoff from live monitor");
      } else {
        await expect(page).toHaveURL(/\/teacher\/results\/live\?[^#]*attempt=/);
        await expect(page.getByText(/attempt detail/i).first()).toBeVisible();
        await expect(page.getByText(/decision support|intervention notes/i).first()).toBeVisible();
        await expectPageWithoutHorizontalSpill(page, "Teacher live monitor attempt detail");
      }
    } else {
      await expect(
        page.getByText(/no attempts currently need intervention beyond routine monitoring/i).first(),
      ).toBeVisible();
    }
  });

  test("@workflow teacher exam detail keeps dense readiness and delivery panels browser-truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /view exam/i }).first().click();
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/]+(?:\?.*)?$/);

    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam configuration$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
    await expect(page.getByText(/^access slots$/i).first()).toBeVisible();
    await expect(page.getByText(/^questions$/i).first()).toBeVisible();
    await expect(page.getByText(/^assigned students$/i).first()).toBeVisible();
    await expect(page.getByText(/^result status$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();

    await expectPageWithoutHorizontalSpill(page, "Teacher exam detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".metricCard, .contentCard", "Teacher exam detail dense card", 8);
  });

  test("@workflow teacher question detail keeps editor and support panels browser-truthful", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await page.goto("/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

    const detailHref = await resolveTeacherQuestionDetailHref(page);
    await page.goto(detailHref);
    await expect(page).toHaveURL(/\/teacher\/question-bank\/[0-9a-f-]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question/i }).first()).toBeVisible();
    await expect(page.getByText(/question authoring/i).first()).toBeVisible();
    await expect(page.getByText(/keep academic mapping, wording, scoring, and answer logic/i).first()).toBeVisible();

    await expectPageWithoutHorizontalSpill(page, "Teacher question detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".contentCard, .fieldStack", "Teacher question detail dense surface", 10);
  });
});
