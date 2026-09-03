import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace, expectTeacherWorkspace } from "../helpers/navigation";
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

async function expectVisibleLocatorsWithoutHorizontalSpill(
  page: Page,
  selector: string,
  label: string,
  sampleSize = 6,
) {
  const locators = page.locator(selector);
  const count = await locators.count();
  let checked = 0;

  for (let index = 0; index < count && checked < sampleSize; index += 1) {
    const locator = locators.nth(index);
    if (!(await locator.isVisible().catch(() => false))) {
      continue;
    }

    const overflow = await locator.evaluate((element) => ({
      clientWidth: (element as HTMLElement).clientWidth,
      scrollWidth: (element as HTMLElement).scrollWidth,
    }));
    expect(
      overflow.scrollWidth,
      `${label} ${checked + 1} should not overflow horizontally (client=${overflow.clientWidth}, scroll=${overflow.scrollWidth})`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 2);
    checked += 1;
  }

  expect(checked, `Expected at least one visible locator for ${label}.`).toBeGreaterThan(0);
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

async function waitForLiveMonitorSurface(page: Page) {
  await page
    .getByRole("link", { name: /^live monitor:\s*loading$/i })
    .first()
    .waitFor({ state: "hidden", timeout: 15000 })
    .catch(() => null);
}

async function hasHydratedLiveMonitor(page: Page) {
  return page
    .getByText(/live monitor refresh|last refreshed at|waiting for first refresh cycle/i)
    .first()
    .isVisible()
    .catch(() => false);
}

test.describe("Operator mobile dense browser coverage", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.setTimeout(120_000);

  test("@workflow teacher mobile dense operator pages keep dense controls browser-truthful", async ({
    page,
  }) => {
    test.skip(testRequiresRole("teacher"), "Teacher Playwright credentials are not configured.");

    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/teacher/results/live");
    await waitForLiveMonitorSurface(page);
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    const teacherUnavailableHeading = page.getByText(/live monitor unavailable/i).first();
    if (await teacherUnavailableHeading.isVisible().catch(() => false)) {
      await expect(teacherUnavailableHeading).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Teacher mobile live monitor unavailable state");
    } else if (!(await hasHydratedLiveMonitor(page))) {
      await expectPageWithoutHorizontalSpill(page, "Teacher mobile live monitor shell");
    } else {
      await expect(
        page
          .getByText(
            /intervention queue|active alerts|no active warning pressure returned from live monitoring/i,
          )
          .first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Teacher mobile live monitor");
      await expectLocatorsWithoutHorizontalSpill(page, ".studentResultsTableRow", "Teacher mobile live monitor row", 4);
    }

    await gotoWithRuntimeRecovery(page, "/teacher/exams");
    await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
    const teacherExamDetailHref = await page.locator("a").evaluateAll((anchors) => {
      const match = anchors
        .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
        .find((candidate) => /^\/teacher\/exams\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
      return match ?? null;
    });
    expect(
      teacherExamDetailHref,
      "Expected at least one teacher exam detail link on the exam management page.",
    ).toBeTruthy();
    await gotoWithRuntimeRecovery(page, teacherExamDetailHref!);
    await expect(page).toHaveURL(/\/teacher\/exams\/[^/]+(?:\?.*)?$/);
    await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
    await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
    await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
    await expectPageWithoutHorizontalSpill(page, "Teacher mobile exam detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".metricCard, .contentCard", "Teacher mobile exam detail dense card", 8);

    await gotoWithRuntimeRecovery(page, "/teacher/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    const teacherDetailHref = await resolveTeacherQuestionDetailHref(page);
    await gotoWithRuntimeRecovery(page, teacherDetailHref);
    await expect(page).toHaveURL(/\/teacher\/question-bank\/[0-9a-f-]+(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /edit question/i }).first()).toBeVisible();
    await expect(page.getByText(/question authoring/i).first()).toBeVisible();
    await expect(page.getByText(/keep academic mapping, wording, scoring, and answer logic/i).first()).toBeVisible();
    await expectPageWithoutHorizontalSpill(page, "Teacher mobile question detail");
    await expectLocatorsWithoutHorizontalSpill(page, ".contentCard, .fieldStack", "Teacher mobile question detail dense surface", 10);
  });

  test("@workflow institute mobile dense operator pages keep dense controls browser-truthful", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/institute/results/live");
    await waitForLiveMonitorSurface(page);

    const emptyStateHeading = page.getByRole("heading", {
      name: /live monitor is useful only during active exam windows/i,
    });
    if (await emptyStateHeading.isVisible().catch(() => false)) {
      await expect(emptyStateHeading).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile live monitor empty state");
    } else if (!(await hasHydratedLiveMonitor(page))) {
      await expectPageWithoutHorizontalSpill(page, "Institute mobile live monitor shell");
    } else {
      await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
      await expect(
        page
          .getByText(
            /intervention queue|active alerts|live monitor unavailable|no active warning pressure returned from live monitoring/i,
          )
          .first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /pause auto refresh|resume auto refresh/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /refresh now/i })).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile live monitor");
      await expectLocatorsWithoutHorizontalSpill(page, ".studentResultsTableRow", "Institute mobile live monitor row", 4);
    }

    await gotoWithRuntimeRecovery(page, "/institute/exams");
    const examsEmptyState = page.getByRole("heading", {
      name: /your institute exam list is empty right now/i,
    });
    const examsLoadIssueState = page.getByRole("heading", {
      name: /institute exams could not be loaded/i,
    });
    if (await examsEmptyState.isVisible().catch(() => false)) {
      await expect(examsEmptyState).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile exams empty state");
    } else if (await examsLoadIssueState.isVisible().catch(() => false)) {
      await expect(examsLoadIssueState).toBeVisible();
      await expect(page.getByText(/load issue|try again soon/i).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile exams load issue");
    } else {
      const instituteExamDetailHref = await page.locator("a").evaluateAll((anchors) => {
        const match = anchors
          .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
          .find((candidate) => /^\/institute\/exams\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
        return match ?? null;
      });
      expect(
        instituteExamDetailHref,
        "Expected at least one institute exam detail link on the exam management page.",
      ).toBeTruthy();
      await gotoWithRuntimeRecovery(page, instituteExamDetailHref!);
      await expect(page).toHaveURL(/\/institute\/exams\/[^/]+(?:\?.*)?$/);
      await expect(page.getByText(/^delivery actions$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
      await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
      await expect(page.getByText(/^student access and stars$/i).first()).toBeVisible();
      await expect(page.getByText(/^exam access key$/i).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile exam detail");
      await expectVisibleLocatorsWithoutHorizontalSpill(
        page,
        ".metricCard, .contentCard",
        "Institute mobile exam detail dense card",
        8,
      );
    }

    await gotoWithRuntimeRecovery(page, "/institute/question-bank");
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();
    const instituteDetailHref = await page.locator("a").evaluateAll((anchors) => {
      const match = anchors
        .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
        .find((candidate) => /^\/institute\/question-bank\/[0-9a-f-]+(?:\?.*)?$/i.test(candidate));
      return match ?? null;
    });
    expect(
      instituteDetailHref,
      "Expected at least one institute question detail link on the question-bank page.",
    ).toBeTruthy();
    await gotoWithRuntimeRecovery(page, instituteDetailHref!);
    await expect(page).toHaveURL(/\/institute\/question-bank\/[^/?#]+(?:\?.*)?$/);
    const questionDetailLoadIssue = page.getByRole("heading", {
      name: /question detail could not be loaded/i,
    });
    if (await questionDetailLoadIssue.isVisible().catch(() => false)) {
      await expect(questionDetailLoadIssue).toBeVisible();
      await expect(page.getByText(/load issue/i).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile question detail load issue");
    } else {
      await expect(page.getByRole("heading", { name: /edit question|duplicate question/i }).first()).toBeVisible();
      await expect(page.getByText(/question identity/i).first()).toBeVisible();
      await expect(page.getByText(/content and scoring/i).first()).toBeVisible();
      await expect(page.getByText(/answer structure/i).first()).toBeVisible();
      await expectPageWithoutHorizontalSpill(page, "Institute mobile question detail");
      await expectLocatorsWithoutHorizontalSpill(
        page,
        ".builderSectionCard, .fieldStack",
        "Institute mobile question detail dense surface",
        10,
      );
    }
  });
});
