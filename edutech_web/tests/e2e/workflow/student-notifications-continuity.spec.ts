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

async function chooseFirstNonDefault(select: Locator, defaultValue: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      disabled: (node as HTMLOptionElement).disabled,
    })),
  );
  const candidate = options.find((option) => option.value && option.value !== defaultValue && !option.disabled);
  if (!candidate) {
    return null;
  }
  await select.selectOption(candidate.value);
  return candidate.value;
}

test.describe("Student notifications continuity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve inbox filter continuity and validate hero handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRetry(page, "/app/notifications");
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);

    const setupState = page.getByText(/waiting for student notifications/i).first();
    if (await isVisible(setupState)) {
      await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const loadIssueState = page.getByText(/student notifications could not be loaded/i).first();
    if (await isVisible(loadIssueState)) {
      await expect(page.getByRole("link", { name: /back to dashboard/i }).first()).toBeVisible();
      return;
    }

    const emptyState = page.getByText(/your notification center is empty right now/i).first();
    if (await isVisible(emptyState)) {
      await expect(page.getByRole("link", { name: /open exams/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/inbox overview/i).first()).toBeVisible();
    await expect(page.getByText(/best next checks/i).first()).toBeVisible();

    const filtersCard = page.locator("section.studentNotificationFiltersCard").first();
    await expect(filtersCard).toBeVisible();

    const statusSelect = filtersCard.getByLabel(/status/i).first();
    const categorySelect = filtersCard.getByLabel(/category/i).first();
    const objectSelect = filtersCard.getByLabel(/related object/i).first();
    const orderingSelect = filtersCard.getByLabel(/sort by/i).first();
    const pageSizeSelect = filtersCard.getByLabel(/page size/i).first();

    await statusSelect.selectOption("unread");
    await expect(page).toHaveURL(/\/app\/notifications\?[^#]*status=unread/);

    const chosenCategory = await chooseFirstNonDefault(categorySelect, "");
    if (chosenCategory) {
      await expect(page).toHaveURL(new RegExp(`/app/notifications\\?[^#]*notification_type=${chosenCategory}`));
    }

    const chosenObject = await chooseFirstNonDefault(objectSelect, "");
    if (chosenObject) {
      await expect(page).toHaveURL(new RegExp(`/app/notifications\\?[^#]*related_object_type=${chosenObject}`));
    }

    await orderingSelect.selectOption("unread_first");
    await expect(page).toHaveURL(/\/app\/notifications\?[^#]*ordering=unread_first/);

    await pageSizeSelect.selectOption("12");
    await expect(page).toHaveURL(/\/app\/notifications\?[^#]*page_size=12/);

    await expect(page.getByText(/status:\s*unread/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*unread first/i).first()).toBeVisible();
    await expect(page.getByText(/page size:\s*12/i).first()).toBeVisible();
    if (chosenCategory) {
      await expect(page.getByText(new RegExp(`category:\\s*${chosenCategory.replaceAll("_", " ")}`, "i")).first()).toBeVisible();
    }
    if (chosenObject) {
      await expect(page.getByText(new RegExp(`object:\\s*${chosenObject.replaceAll("_", " ")}`, "i")).first()).toBeVisible();
    }

    const toolbar = page.locator("section.studentNotificationToolbar").first();
    const toolbarVisible = await isVisible(toolbar);
    const groupBySelect = toolbar.locator("label.studentNotificationGroupingControl select").first();
    const groupingControlVisible = toolbarVisible && (await isVisible(groupBySelect));
    if (groupingControlVisible) {
      await groupBySelect.selectOption("status");
      await expect(groupBySelect).toHaveValue("status");
      await expect(page.getByText(/read notifications|unread notifications/i).first()).toBeVisible();
    }

    const noMatches = page.getByText(/no notifications match the current filters/i).first();
    if (await isVisible(noMatches)) {
      await expect(page.getByRole("link", { name: /clear filters/i }).first()).toBeVisible();
      await page.getByRole("link", { name: /clear filters/i }).first().click();
      await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
      return;
    }

    await expect(page.getByText(/matching notifications/i).first()).toBeVisible();
    await expect(page.getByText(/page 1 of/i).first()).toBeVisible();

    const nextLink = page.getByRole("link", { name: /^next$/i }).first();
    if (await isVisible(nextLink)) {
      const href = await nextLink.getAttribute("href");
      expect(href).toBeTruthy();
      if (href) {
        expect(href).toContain("status=unread");
        expect(href).toContain("page_size=12");
        expect(href).toContain("ordering=unread_first");
        if (groupingControlVisible) {
          expect(href).toContain("group_by=status");
        }
        if (chosenCategory) expect(href).toContain(`notification_type=${chosenCategory}`);
        if (chosenObject) expect(href).toContain(`related_object_type=${chosenObject}`);
      }
    }

    const continuityQuery = groupingControlVisible
      ? "/app/notifications?status=unread&ordering=unread_first&page_size=12&group_by=status"
      : "/app/notifications?status=unread&ordering=unread_first&page_size=12";

    for (const cta of [
      {
        name: /open results/i,
        url: /\/app\/results(?:\?.*)?$/,
        assertion: () => expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible(),
      },
      {
        name: /back to dashboard/i,
        url: /\/app\/dashboard(?:\?.*)?$/,
        assertion: () => expect(page.getByText(/next best step|recommended for you|report spotlight/i).first()).toBeVisible(),
      },
      {
        name: /open attempt timeline/i,
        url: /\/app\/attempts(?:\?.*)?$/,
        assertion: () => expect(page.getByRole("heading", { name: /attempts/i }).first()).toBeVisible(),
      },
    ]) {
      await gotoWithRetry(page, continuityQuery);
      const link = page.getByRole("link", { name: cta.name }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(cta.url);
      await cta.assertion();
    }

    await gotoWithRetry(page, continuityQuery);
    await expect(page.getByText(/matching notifications|no notifications match the current filters/i).first()).toBeVisible();
  });
});
