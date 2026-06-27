import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_CONNECTION_REFUSED") || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(1500 * attempt);
    }
  }
  throw lastError;
}

async function isVisible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

async function expectAnyVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const locator = page.getByText(pattern).first();
    if (await isVisible(locator)) {
      await expect(locator).toBeVisible();
      return locator;
    }
  }
  throw new Error(`Expected one of these patterns to be visible: ${patterns.map(String).join(", ")}`);
}

test.describe("Student notifications workspace", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can validate notification actions, filters, grouping, and route handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/notifications");
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
    await expect(
      page.locator("body"),
    ).toContainText(
      /notifications|waiting for student notifications|student notifications could not be loaded|your notification center is empty right now/i,
      { timeout: 30000 },
    );

    const setupState = page.getByText(/waiting for student notifications/i).first();
    if (await isVisible(setupState)) {
      await expect(page.getByText(/notifications list endpoint/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const loadIssueState = page.getByText(/student notifications could not be loaded/i).first();
    if (await isVisible(loadIssueState)) {
      await expect(page.getByText(/backend connectivity/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const emptyState = page.getByText(/your notification center is empty right now/i).first();
    if (await isVisible(emptyState)) {
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/inbox overview/i).first()).toBeVisible();
    await expect(page.getByText(/how to use this inbox/i).first()).toBeVisible();
    await expect(page.getByText(/best next checks/i).first()).toBeVisible();
    await expect(page.getByText(/truthful notification flow/i).first()).toBeVisible();
    await expect(page.getByText(/a strong sequence is: open the linked learner route/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /check result status/i }).first()).toBeVisible();

    const filtersCard = page.locator("section.studentNotificationFiltersCard").first();
    await expect(filtersCard).toBeVisible();

    const toolbar = page.locator("section.studentNotificationToolbar").first();
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByText(/matching notifications/i).first()).toBeVisible();

    const notificationCards = page.locator("article.studentNotificationSurface");
    const initialCardCount = await notificationCards.count();
    expect(initialCardCount).toBeGreaterThan(0);

    const firstCard = notificationCards.first();
    const firstTitle = (await firstCard.locator(".studentResultSurfaceHead strong").first().textContent())?.trim() ?? "";
    expect.soft(firstTitle.length).toBeGreaterThan(0);

    const unreadBadge = page.getByText(/unread alerts|unread on this inbox/i).first();
    await expect(unreadBadge).toBeVisible();

    const firstMarkReadButton = page.getByRole("button", { name: /^mark read$/i }).first();
    if (await isVisible(firstMarkReadButton)) {
      await firstMarkReadButton.click();
      await expect(
        page.getByText(/notification marked as read/i).first(),
      ).toBeVisible();
    }

    const markAllReadButton = page.getByRole("button", { name: /mark all read/i }).first();
    if (await isVisible(markAllReadButton) && (await markAllReadButton.isEnabled().catch(() => false))) {
      await markAllReadButton.click();
      await expect(
        page.getByText(/all notifications marked as read/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/0 unread on this inbox/i).first()).toBeVisible();
    }

    const searchInput = filtersCard.getByPlaceholder(/search titles, messages, or alert categories/i).first();
    await expect(searchInput).toBeVisible();
    if (firstTitle) {
      const searchToken = firstTitle.split(/\s+/).find((value) => value.length >= 4) ?? firstTitle;
      await searchInput.fill(searchToken);
      await expect(page).toHaveURL(new RegExp(`/app/notifications\\?[^#]*search=${encodeURIComponent(searchToken)}`));
    }

    const statusSelect = filtersCard.getByLabel(/status/i).first();
    await statusSelect.selectOption("read");
    await expect(page).toHaveURL(/\/app\/notifications\?[^#]*status=read/);
    await expect(page.getByText(/status:\s*read/i).first()).toBeVisible();

    const groupBySelect = page.locator("label.studentNotificationGroupingControl select").first();
    await groupBySelect.selectOption("type");
    await expect(groupBySelect).toHaveValue("type");

    const noMatches = page.getByText(/no notifications match the current filters/i).first();
    if (await isVisible(noMatches)) {
      await expect(page.getByRole("link", { name: /clear filters/i }).first()).toBeVisible();
    } else {
      await expect(page.getByText(/matching notifications/i).first()).toBeVisible();
      await expectAnyVisible(page, [/open exam detail/i, /open attempt summary/i, /open notification detail/i]);
    }

    await filtersCard.getByRole("link", { name: /^reset$/i }).click();
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);

    const actionLink = page.getByRole("link", {
      name: /open exam detail|open attempt summary|open notification detail/i,
    }).first();
    if (await isVisible(actionLink)) {
      const href = await actionLink.getAttribute("href");
      expect(href).toBeTruthy();
      if (href) {
        await actionLink.click();
        await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  });
});
