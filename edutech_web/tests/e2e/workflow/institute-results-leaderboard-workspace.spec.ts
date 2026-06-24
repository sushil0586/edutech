import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

async function expectInstituteLeaderboardWorkspace(page: Page) {
  await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
  await expect(page.getByText(/publication checklist/i).first()).toBeVisible();
  await expect(page.getByText(/^leaderboard$/i).first()).toBeVisible();
  await expect(page.getByText(/ranked learners/i).first()).toBeVisible();
  await expect(page.getByText(/published results/i).first()).toBeVisible();
  await expect(page.getByText(/average score/i).first()).toBeVisible();
}

async function expectLeaderboardContent(page: Page) {
  const leaderboardSection = page.locator("section.contentCard").filter({
    has: page.getByText(/^leaderboard$/i),
  }).first();
  const rows = leaderboardSection.locator(".resultsList .resultCard");
  const rowCount = await rows.count();

  if (rowCount > 0) {
    const firstRow = rows.first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator(".statusPill").first()).toContainText(/rank/i);
    await expect(firstRow.locator(".resultBreakdown div")).toHaveCount(3);
    await expect(firstRow.locator(".resultBreakdown")).toContainText(/final score/i);
    await expect(firstRow.locator(".resultBreakdown")).toContainText(/percentage/i);
    await expect(firstRow.locator(".resultBreakdown")).toContainText(/time taken/i);
    return;
  }

  await expect(leaderboardSection.getByText(/no leaderboard rows are available yet for this exam/i)).toBeVisible();
}

function leaderboardSection(page: Page) {
  return page.locator("section.contentCard").filter({
    has: page.getByText(/^leaderboard$/i),
  }).first();
}

async function maybeExercisePagination(page: Page, previousLink: Locator, nextLink: Locator) {
  const nextHref = await nextLink.getAttribute("href");
  if (!nextHref || nextHref === "#") {
    return;
  }

  await nextLink.click();
  await expect(page).toHaveURL(/\/institute\/results\/leaderboard\?[^#]*leaderboard_page=2/);
  await expect(leaderboardSection(page).getByText(/^leaderboard$/i)).toBeVisible();

  const previousHref = await previousLink.getAttribute("href");
  if (!previousHref || previousHref === "#") {
    return;
  }

  await previousLink.click();
  await expect(page).toHaveURL(/\/institute\/results\/leaderboard(?:\?.*)?$/);
  await expect(leaderboardSection(page).getByText(/^leaderboard$/i)).toBeVisible();
}

test.describe("Institute results leaderboard workspace", () => {
  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute can inspect the leaderboard workspace", async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);
    await expectLeaderboardContent(page);

    const builderHref = await page.locator('a[href*="/institute/exams/"][href$="/builder"]').first().getAttribute("href");
    const examId = builderHref?.match(/\/institute\/exams\/([^/?#]+)\/builder/)?.[1] ?? null;
    expect(examId).toBeTruthy();

    const previousLink = leaderboardSection(page).getByRole("link", { name: /^previous$/i });
    const nextLink = leaderboardSection(page).getByRole("link", { name: /^next$/i });

    const nextVisible = await nextLink.isVisible().catch(() => false);
    if (nextVisible) {
      await maybeExercisePagination(page, previousLink, nextLink);
    }

    const openExamLink = page.locator(`a[href="/institute/exams/${examId}"]`).first();
    const openBuilderLink = page.locator(`a[href="/institute/exams/${examId}/builder"]`).first();
    await expect(openExamLink).toHaveAttribute("href", `/institute/exams/${examId}`);
    await expect(openBuilderLink).toHaveAttribute("href", `/institute/exams/${examId}/builder`);

    await page.goto(`/institute/exams/${examId}`);
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+(?:\?.*)?$/);
    await expect(page.getByText(/exam code/i).first()).toBeVisible();

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);

    await page.goto(`/institute/exams/${examId}/builder`);
    await expect(page).toHaveURL(/\/institute\/exams\/[^/?#]+\/builder(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /builder/i }).first()).toBeVisible();

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);

    await page.getByRole("link", {
      name: /overview.*workflow, readiness, and exam health/i,
    }).first().click();
    await expect(page).toHaveURL(/\/institute\/results(?:\?.*)?$/);
    await expect(page.getByText(/workflow, readiness, and exam health/i).first()).toBeVisible();

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);

    await page.getByRole("link", {
      name: /live monitor.*intervention queue and active alerts/i,
    }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/live(?:\?.*)?$/);
    await expect(page.getByText(/^live monitor$/i).first()).toBeVisible();

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);

    await page.getByRole("link", {
      name: /attempts.*review filters and attempt-by-attempt details/i,
    }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/attempts(?:\?.*)?$/);
    await expect(page.getByText(/^attempts$/i).first()).toBeVisible();

    await page.goto("/institute/results/leaderboard");
    await expectInstituteLeaderboardWorkspace(page);

    await page.getByRole("link", {
      name: /analysis.*topics, hard questions, and skip patterns/i,
    }).first().click();
    await expect(page).toHaveURL(/\/institute\/results\/analysis(?:\?.*)?$/);
    await expect(page.getByText(/question risk board/i).first()).toBeVisible();
  });
});
