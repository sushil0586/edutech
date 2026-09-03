import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

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
  return options.find((option) => option.value && option.value !== defaultValue && !option.disabled) ?? null;
}

test.describe("Student mobile report continuity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("@workflow student mobile notifications search and downloads preserve their continuity contracts", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/notifications");
    await expect(page).toHaveURL(/\/app\/notifications(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /notifications/i }).first()).toBeVisible();

    const notificationsBlocked = page.getByText(
      /waiting for student notifications|student notifications could not be loaded|your notification center is empty right now/i,
    ).first();
    if (!(await isVisible(notificationsBlocked))) {
      const filtersCard = page.locator("section.studentNotificationFiltersCard").first();
      await expect(filtersCard).toBeVisible();
      await filtersCard.getByLabel(/status/i).selectOption("unread");
      await expect(page).toHaveURL(/\/app\/notifications\?[^#]*status=unread/);
      await filtersCard.getByLabel(/page size/i).selectOption("12");
      await expect(page).toHaveURL(/\/app\/notifications\?[^#]*page_size=12/);
      await expect(page.getByText(/status:\s*unread/i).first()).toBeVisible();
      await expect(page.getByText(/page size:\s*12/i).first()).toBeVisible();
    }

    await gotoWithRuntimeRecovery(page, "/app/search?q=results");
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();
    const searchForm = page.locator("form.workspaceFiltersForm").first();
    await expect(searchForm).toBeVisible();
    await searchForm.locator('select[name="source"]').selectOption("catalog");
    await searchForm.locator('select[name="group"]').selectOption("section");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=catalog/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=section/);

    const liveRecordsChip = page.getByRole("link", { name: /live records/i }).first();
    await expect(liveRecordsChip).toBeVisible();
    await liveRecordsChip.click();
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=live/);
    await expect(page.getByText(/source:\s*live/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/app/analytics/downloads");
    await expect(page).toHaveURL(/\/app\/analytics\/downloads(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible();

    const sourceSelect = page.getByLabel(/source view/i).first();
    const subjectSelect = page.getByLabel(/subject view/i).first();
    const chosenSource = await chooseFirstNonDefault(sourceSelect, "all");
    const chosenSubject = await chooseFirstNonDefault(subjectSelect, "all");
    if (chosenSource) {
      await sourceSelect.selectOption(chosenSource.value);
    }
    if (chosenSubject) {
      await subjectSelect.selectOption(chosenSubject.value);
    }
    await page.getByRole("button", { name: /apply filters/i }).first().click();
    await expect(page).toHaveURL(/\/app\/analytics\/downloads(?:\?.*)?$/);

    const currentUrl = new URL(page.url());
    const expectedSource = currentUrl.searchParams.get("source");
    const expectedSubject = currentUrl.searchParams.get("subject");

    const targetLinks = [
      { name: /open results report/i, url: /\/app\/results(?:\?.*)?$/ },
      { name: /open wrong questions report/i, url: /\/app\/analytics\/wrong-questions(?:\?.*)?$/ },
      { name: /open time management report/i, url: /\/app\/analytics\/time-management(?:\?.*)?$/ },
    ] as const;

    for (const target of targetLinks) {
      await gotoWithRuntimeRecovery(page, `/app/analytics/downloads${currentUrl.search}`);
      const link = page.getByRole("link", { name: target.name }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(target.url);
      const routedUrl = new URL(page.url());
      if (expectedSource && expectedSource !== "all") {
        expect(routedUrl.searchParams.get("source")).toBe(expectedSource);
      }
      if (expectedSubject && expectedSubject !== "all" && expectedSubject !== "overall") {
        expect(routedUrl.searchParams.get("subject")).toBe(expectedSubject);
      }
    }
  });
});
