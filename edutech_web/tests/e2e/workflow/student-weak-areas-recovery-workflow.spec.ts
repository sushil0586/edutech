import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function clickOrGotoHref(page: Page, href: string | null, urlPattern: RegExp) {
  expect(href).not.toBeNull();
  if (urlPattern.test(page.url())) {
    return;
  }

  const resolvedUrl = new URL(href!, page.url());
  await page.goto(`${resolvedUrl.pathname}${resolvedUrl.search}`, { waitUntil: "commit" });
  await page.waitForLoadState("load").catch(() => null);
}

async function expectWeakAreasRoute(page: Page) {
  await expect(page).toHaveURL(/\/app\/weak-areas(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /weak areas/i }).first()).toBeVisible();
}

test.describe("Student weak areas recovery workflow", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can follow weak-area recovery handoffs into topic, question evidence, practice, and exams", async ({
    page,
  }) => {
    test.setTimeout(120000);

    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectWeakAreasRoute(page);

    const loadIssue = page
      .getByText(/weak-area analytics could not be loaded|waiting for weak-area analytics/i)
      .first();
    if (await loadIssue.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /open analytics/i }).first()).toBeVisible();
      return;
    }

    const emptyState = page
      .getByText(/topic analytics are not available right now|waiting for topic performance data/i)
      .first();
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /start an exam/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/improvement priority/i).first()).toBeVisible();
    await expect(page.getByText(/recovery lane/i).first()).toBeVisible();

    const chooseMockTestLink = page.getByRole("link", { name: /choose mock test/i }).first();
    await expect(chooseMockTestLink).toBeVisible();
    const chooseMockTestHref = await chooseMockTestLink.getAttribute("href");
    await chooseMockTestLink.click();
    await clickOrGotoHref(page, chooseMockTestHref, /\/app\/exams(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/exams(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /tests|exams/i }).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectWeakAreasRoute(page);

    const firstTopicRow = page.locator(".studentTopicMasteryTable tbody tr").first();
    await expect(firstTopicRow).toBeVisible();
    const topicLabel = ((await firstTopicRow.locator("td strong").first().textContent()) ?? "").trim();
    await firstTopicRow.click();

    const modal = page.getByRole("dialog").first();
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/topic mastery/i).first()).toBeVisible();

    const topicDrilldownLink = modal.getByRole("link", { name: /open topic drilldown/i }).first();
    const questionEvidenceLink = modal.getByRole("link", { name: /question evidence/i }).first();
    const practiceLink = modal.getByRole("link", { name: /start practice/i }).first();

    await expect(topicDrilldownLink).toBeVisible();
    await expect(questionEvidenceLink).toBeVisible();
    await expect(practiceLink).toBeVisible();

    await topicDrilldownLink.click();
    await expect(page).toHaveURL(/\/app\/analytics\/topics\/[^/?#]+(?:\?.*)?$/);

    const topicLoadIssue = page.getByText(/topic analytics could not be loaded/i).first();
    if (!(await topicLoadIssue.isVisible().catch(() => false))) {
      await expect(page.getByText(/topic focus/i).first()).toBeVisible();
      if (topicLabel && !/^untagged topic$/i.test(topicLabel)) {
        await expect(page.getByRole("heading", { name: new RegExp(topicLabel, "i") }).first()).toBeVisible();
      } else {
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      }

      const practiceTopicLink = page.getByRole("link", { name: /practice this topic|open practice lane/i }).first();
      await expect(practiceTopicLink).toBeVisible();
      const practiceTopicHref = await practiceTopicLink.getAttribute("href");
      await practiceTopicLink.click();
      await clickOrGotoHref(page, practiceTopicHref, /\/app\/practice(?:\?.*)?$/);
      await expect(page).toHaveURL(/\/app\/practice(?:\?.*)?$/);
    } else {
      await expect(page.getByRole("link", { name: /back to analytics/i }).first()).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/app/weak-areas");
    await expectWeakAreasRoute(page);
    await firstTopicRow.click();
    await expect(modal).toBeVisible();
    const questionEvidenceHref = await questionEvidenceLink.getAttribute("href");
    await questionEvidenceLink.click();
    await clickOrGotoHref(page, questionEvidenceHref, /\/app\/analytics\/questions(?:\?.*)?$/);
    await expect(page).toHaveURL(/\/app\/analytics\/questions(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /question pattern report/i }).first()).toBeVisible();
  });
});
