import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await locator.isVisible().catch(() => false)) {
      await expect(locator).toBeVisible();
      return;
    }
  }
  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

async function expectVisiblePaginationControlsToAvoidHashLinks(page: Page) {
  const visiblePagers = page.locator(".workspaceFilterActions").filter({
    has: page.getByText(/previous|next/i),
  });
  const visibleCount = await visiblePagers.count();

  for (let index = 0; index < visibleCount; index += 1) {
    const pager = visiblePagers.nth(index);
    if (!(await pager.isVisible().catch(() => false))) {
      continue;
    }

    const links = pager.locator('a[href="#"]');
    await expect(links).toHaveCount(0);
  }
}

async function expectInstituteResultsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  const emptyStateHeading = page.getByRole("heading", {
    name: /overview becomes useful after exams and attempts exist in your institute scope/i,
  });
  if (await emptyStateHeading.isVisible().catch(() => false)) {
    await expect(emptyStateHeading).toBeVisible();
    await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
    return false;
  }

  await expect(page.getByRole("combobox", { name: /exam state/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /overview.*workflow, readiness, and exam health/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
  await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
  return true;
}

async function readExamCardSnapshot(resultCard: ReturnType<Page["locator"]>) {
  const title =
    (await resultCard.locator(".resultCardTop strong").first().textContent())?.trim() ?? "";
  const publicationLabel =
    (await resultCard.locator(".resultCardTop .statusPill").first().textContent())?.trim() ?? "";

  return {
    title,
    publicationLabel,
  };
}

async function expectWorkflowLinkUtility(page: Page) {
  const workflowGrid = page.locator(".teacherWorkflowGrid").first();
  const workflowLink = workflowGrid
    .getByRole("link")
    .filter({
      hasText: /open exam lifecycle|open review queue|finish lifecycle|open exam/i,
    })
    .first();

  if (!(await workflowLink.isVisible().catch(() => false))) {
    return;
  }

  const href = await workflowLink.getAttribute("href");
  expect(href).toBeTruthy();
  await workflowLink.click();

  if (href?.includes("/institute/reviews")) {
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    return;
  }

  await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
  await expect(page.getByText(/exam code/i).first()).toBeVisible();
}

test.describe("Institute results workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can filter and navigate the results workspace", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results");
    const resultsLoaded = await expectInstituteResultsWorkspace(page);
    if (!resultsLoaded) {
      await expect(
        page.getByText(/start by creating your first exam, then publish it and collect a few student attempts/i).first(),
      ).toBeVisible();
      await page.getByRole("link", { name: /open exams/i }).first().click();
      await expect(page).toHaveURL(/\/institute\/exams(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
      return;
    }

    await page.getByRole("combobox", { name: /exam state/i }).selectOption("published");
    await page.getByRole("combobox", { name: /sort by/i }).selectOption("title");
    await page.getByRole("combobox", { name: /group by/i }).selectOption("status");
    await page.getByRole("combobox", { name: /page size/i }).selectOption("14");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_filter=published/);
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_sort=title/);
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_group=status/);
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_page_size=14/);
    await expect(page.getByText(/exam state: published/i)).toBeVisible();
    await expect(page.getByText(/group: status/i)).toBeVisible();

    await page.getByRole("link", { name: /reset exam filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    await page.getByRole("combobox", { name: /group by/i }).selectOption("publication");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_group=publication/);
    await expect(page.getByText(/group: publication/i)).toBeVisible();
    const visibleExamsMetric =
      (await page.getByText(/^\d+ exam(s)? visible$/i).first().textContent())?.trim() ?? "";
    const visibleExamCount = Number.parseInt(visibleExamsMetric, 10);

    if (Number.isFinite(visibleExamCount) && visibleExamCount > 0) {
      await expect(
        page.locator(".resultsList > .workspaceResultsGroup .sectionHeading strong").first(),
      ).toBeVisible();
      const firstGroupedSection = page
        .locator(".resultsList > .workspaceResultsGroup")
        .filter({ has: page.locator(".sectionHeading strong") })
        .first();
      const groupedHeading =
        (await firstGroupedSection.locator(".sectionHeading strong").first().textContent())?.trim() ??
        "";
      const groupedCardSnapshot = await readExamCardSnapshot(
        firstGroupedSection.locator(".resultCard").first(),
      );
      expect(groupedCardSnapshot.publicationLabel).toBe(groupedHeading);
    } else {
      await expect(page.getByText(/no exams match the current result filters/i)).toBeVisible();
      await expect(page.getByText(/why this happened/i).first()).toBeVisible();
      await expect(page.getByText(/they do not edit, hide, or delete any exam data/i).first()).toBeVisible();
    }

    await page.getByRole("link", { name: /reset exam filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);

    const refreshStatusButton = page.getByRole("button", { name: /refresh exam status/i });
    if (await refreshStatusButton.isVisible().catch(() => false)) {
      await refreshStatusButton.click();
      await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
      await expectInstituteResultsWorkspace(page);
      await expectVisiblePaginationControlsToAvoidHashLinks(page);
    }

    await expectWorkflowLinkUtility(page);

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    await expect(page.getByRole("link", { name: /view exam/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /view leaderboard/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /view leaderboard/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
    await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
    await expectVisiblePaginationControlsToAvoidHashLinks(page);

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const openExamLink = page.getByRole("link", { name: /^view exam$/i }).first();
    await expect(openExamLink).toBeVisible();
    const openExamHref = await openExamLink.getAttribute("href");
    const examId = openExamHref?.match(/\/institute\/exams\/([^/?#]+)/)?.[1] ?? null;
    expect(examId).toBeTruthy();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const openExamForBuilder = page.getByRole("link", { name: /^view exam$/i }).first();
    await expect(openExamForBuilder).toBeVisible();
    await openExamForBuilder.click();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /open builder/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    await page.goto(`/institute/reviews?exam=${examId}`);
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const liveMonitorNavLink = page.getByRole("link", {
      name: /live monitor.*intervention queue and active alerts/i,
    }).first();
    await expect(liveMonitorNavLink).toBeVisible();
    const liveMonitorHref = await liveMonitorNavLink.getAttribute("href");
    expect(liveMonitorHref).toBeTruthy();
    await page.goto(liveMonitorHref!);
    await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();
    await expectAnyVisible(page, [
      /intervention queue/i,
      /live monitor unavailable/i,
      /no active warning pressure returned from live monitoring/i,
      /active alerts/i,
    ]);

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const analysisCard = page.getByRole("link").filter({
      has: page.getByText(/^analysis$/i),
    }).first();
    await expect(analysisCard).toBeVisible();
    await analysisCard.click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
    await expect(page.getByText(/student explorer/i).first()).toBeVisible();
  });
});
