import { expect, test, type Locator } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectStudentWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function visible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

async function pickFirstNonDefault(select: Locator, defaultValue: string) {
  const options = await select.locator("option").evaluateAll((nodes) =>
    nodes.map((node) => ({
      value: (node as HTMLOptionElement).value,
      label: (node as HTMLOptionElement).label,
    })),
  );
  return options.find((option) => option.value && option.value !== defaultValue) ?? null;
}

test.describe("Student search continuity", () => {
  test.skip(testRequiresRole("student"), "Student Playwright credentials are not configured.");

  test("@workflow student can preserve query continuity across search chips sections and shell handoffs", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    await expectStudentWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/app/search?q=results");
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page.getByRole("heading", { name: /search/i }).first()).toBeVisible();

    const searchForm = page.locator("form.workspaceFiltersForm").first();
    const sectionSelect = searchForm.locator('select[name="section"]').first();
    const sourceSelect = searchForm.locator('select[name="source"]').first();
    const sortSelect = searchForm.locator('select[name="sort"]').first();
    const groupSelect = searchForm.locator('select[name="group"]').first();

    const chosenSection = await pickFirstNonDefault(sectionSelect, "all");
    if (chosenSection) {
      await sectionSelect.selectOption(chosenSection.value);
    }
    await sourceSelect.selectOption("catalog");
    await sortSelect.selectOption("section");
    await groupSelect.selectOption("source");
    await searchForm.getByRole("button", { name: /apply filters/i }).click();

    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=catalog/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*sort=section/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=source/);
    if (chosenSection) {
      await expect(page).toHaveURL(
        new RegExp(`/app/search\\?[^#]*section=${encodeURIComponent(chosenSection.value).replace(/%20/g, "\\+")}`),
      );
      await expect(page.getByText(new RegExp(`section:\\s*${chosenSection.value}`, "i")).first()).toBeVisible();
    }
    await expect(page.getByText(/source:\s*catalog/i).first()).toBeVisible();
    await expect(page.getByText(/sort:\s*section/i).first()).toBeVisible();
    await expect(page.getByText(/group:\s*source/i).first()).toBeVisible();

    const workspacePagesChip = page.getByRole("link", { name: /workspace pages/i }).first();
    await expect(workspacePagesChip).toHaveClass(/workspaceQuickChipActive/);
    const liveRecordsChip = page.getByRole("link", { name: /live records/i }).first();
    await expect(liveRecordsChip).toBeVisible();
    await liveRecordsChip.click();

    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*source=live/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=source/);
    if (chosenSection) {
      await expect(page).toHaveURL(
        new RegExp(`/app/search\\?[^#]*section=${encodeURIComponent(chosenSection.value).replace(/%20/g, "\\+")}`),
      );
    }
    await expect(page.getByText(/source:\s*live/i).first()).toBeVisible();

    const noResults = page.getByText(/no pages or live records matched this search/i).first();
    if (await visible(noResults)) {
      await expect(noResults).toBeVisible();
    } else {
      await expect(page.getByText(/live records|workspace pages/i).first()).toBeVisible();
      const firstResult = page.locator(".detailCard").first();
      await expect(firstResult).toBeVisible();
      const href = await firstResult.getAttribute("href");
      expect(href).toBeTruthy();
      await firstResult.click();
      await expect(page).toHaveURL(/\/app\/(results|analytics|practice|attempts|notifications|settings|wallet|subscriptions|exams)(?:\/|$|\?)/);
      await gotoWithRuntimeRecovery(
        page,
        `/app/search?q=results${chosenSection ? `&section=${chosenSection.value}` : ""}&source=live&sort=section&group=source`,
      );
    }

    const groupBySectionChip = page.getByRole("link", { name: /group by section/i }).first();
    await expect(groupBySectionChip).toBeVisible();
    await groupBySectionChip.click();
    await expect(page).toHaveURL(/\/app\/search\?[^#]*q=results/);
    await expect(page).toHaveURL(/\/app\/search\?[^#]*group=section/);
    await expect(page.getByText(/group:\s*section/i).first()).toBeVisible();
    if (!(await visible(noResults))) {
      const sectionHeading = page.locator(".contentCard .sectionHeading").filter({ hasText: /items/i }).first();
      if (await visible(sectionHeading)) {
        await expect(sectionHeading).toBeVisible();
      }
    }

    await gotoWithRuntimeRecovery(page, "/app/search?q=results");
    const shellCtas = [
      {
        name: /back to workspace/i,
        url: /\/app\/dashboard(?:\?.*)?$/,
        assert: () => expect(page.getByText(/next best step|recommended for you|report spotlight/i).first()).toBeVisible(),
      },
      {
        name: /open dashboard/i,
        url: /\/app\/dashboard(?:\?.*)?$/,
        assert: () => expect(page.getByText(/next best step|recommended for you|report spotlight/i).first()).toBeVisible(),
      },
      {
        name: /open reports hub/i,
        url: /\/app\/reports(?:\?.*)?$/,
        assert: () => expect(page.getByRole("heading", { name: /reports hub|downloadable reports center/i }).first()).toBeVisible(),
      },
      {
        name: /open analytics/i,
        url: /\/app\/analytics(?:\?.*)?$/,
        assert: () => expect(page.getByRole("heading", { name: /student analytics|performance overview|analytics/i }).first()).toBeVisible(),
      },
    ] as const;

    for (const cta of shellCtas) {
      await gotoWithRuntimeRecovery(page, "/app/search?q=results");
      const link = page.getByRole("link", { name: cta.name }).first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(cta.url);
      await cta.assert();
    }
  });
});
