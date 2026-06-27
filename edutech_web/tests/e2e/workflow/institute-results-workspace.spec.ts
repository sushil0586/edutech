import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteResultsWorkspace(page: Page) {
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByRole("combobox", { name: /exam state/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /overview.*workflow, readiness, and exam health/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();
  await expect(page.getByText(/^result publish readiness$/i).first()).toBeVisible();
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
    await expectInstituteResultsWorkspace(page);

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

    await page.getByRole("combobox", { name: /group by/i }).selectOption("publication");
    await page.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results\?[^#]*exam_list_group=publication/);
    await expect(page.getByText(/group: publication/i)).toBeVisible();
    const visibleExamsMetric =
      (await page.getByText(/^\d+ exams visible$/i).first().textContent())?.trim() ?? "";
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
    }

    await page.getByRole("link", { name: /reset exam filters/i }).click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);

    const refreshStatusButton = page.getByRole("button", { name: /refresh exam status/i });
    if (await refreshStatusButton.isVisible().catch(() => false)) {
      await refreshStatusButton.click();
      await expect(page).toHaveURL(/\/institute\/results(?:\?.*message=.*)?$/);
      await expectInstituteResultsWorkspace(page);
    }

    await expectWorkflowLinkUtility(page);

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    await expect(page.getByRole("link", { name: /open exam/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open builder/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open reviews/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /inspect question bank/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open leaderboard/i }).first()).toBeVisible();

    await page.getByRole("link", { name: /open leaderboard/i }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
    await expect(page.getByText(/publication checklist/i).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const openExamLink = page.getByRole("link", { name: /^open exam$/i }).first();
    await expect(openExamLink).toBeVisible();
    await openExamLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const openBuilderLink = page.getByRole("link", { name: /^open builder$/i }).first();
    await expect(openBuilderLink).toBeVisible();
    await openBuilderLink.click();
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const openReviewsLink = page.getByRole("link", { name: /^open reviews$/i }).first();
    await expect(openReviewsLink).toBeVisible();
    await openReviewsLink.click();
    await expect(page).toHaveURL(/\/institute\/reviews\?[^#]*exam=/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();

    await page.goto("/institute/results");
    await expectInstituteResultsWorkspace(page);

    const inspectQuestionBankLink = page.getByRole("link", { name: /inspect question bank/i }).first();
    await expect(inspectQuestionBankLink).toBeVisible();
    await inspectQuestionBankLink.click();
    await expect(page).toHaveURL(/\/institute\/question-bank(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question bank/i }).first()).toBeVisible();

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
    await expect(page.getByText(/intervention queue/i).first()).toBeVisible();

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
