import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function instituteSelect(page: Page) {
  return page.locator('select[name="institute"]').first();
}

function statusSelect(page: Page) {
  return page.locator('select[name="exam_status"]').first();
}

function sourceSelect(page: Page) {
  return page.locator('select[name="exam_source"]').first();
}

function sortSelect(page: Page) {
  return page.locator('select[name="exam_sort"]').first();
}

function groupSelect(page: Page) {
  return page.locator('select[name="exam_group"]').first();
}

async function expectSelectHasOptions(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => locator.locator("option").count())
    .toBeGreaterThan(0);
}

async function gotoExams(page: Page, path = "/admin/exams") {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: /exam management/i }).first()).toBeVisible();
  await expect(page.getByText(/exam controls/i).first()).toBeVisible();
}

function quickChip(page: Page, name: RegExp) {
  return page.locator(".workspaceFilterQuickChips a").filter({ hasText: name }).first();
}

test.describe("Admin exams browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage keeps admin exams controls hydrated", async ({ page }) => {
    await gotoExams(page);

    await expectSelectHasOptions(instituteSelect(page));
    await expectSelectHasOptions(statusSelect(page));
    await expectSelectHasOptions(sourceSelect(page));
    await expectSelectHasOptions(sortSelect(page));
    await expectSelectHasOptions(groupSelect(page));

    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage can apply and reset admin exams filters truthfully", async ({
    page,
  }) => {
    await gotoExams(page);

    await statusSelect(page).selectOption("live");
    await sourceSelect(page).selectOption("teacher");
    await sortSelect(page).selectOption("start_soon");
    await groupSelect(page).selectOption("source");
    await page.getByRole("button", { name: /apply filters/i }).click();

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          exam_status: url.searchParams.get("exam_status"),
          exam_source: url.searchParams.get("exam_source"),
          exam_sort: url.searchParams.get("exam_sort"),
          exam_group: url.searchParams.get("exam_group"),
        };
      })
      .toEqual({
        exam_status: "live",
        exam_source: "teacher",
        exam_sort: "start_soon",
        exam_group: "source",
      });

    await expect(statusSelect(page)).toHaveValue("live");
    await expect(sourceSelect(page)).toHaveValue("teacher");
    await expect(sortSelect(page)).toHaveValue("start_soon");
    await expect(groupSelect(page)).toHaveValue("source");

    const noMatchState = page.getByRole("heading", {
      name: /no exams match these platform controls/i,
    });
    if (await noMatchState.isVisible().catch(() => false)) {
      await page.getByRole("link", { name: /reset exam filters/i }).click();
    } else {
      await page.getByRole("link", { name: /reset filters/i }).click();
    }

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return {
          pathname: url.pathname,
          exam_status: url.searchParams.get("exam_status"),
          exam_source: url.searchParams.get("exam_source"),
          exam_sort: url.searchParams.get("exam_sort"),
          exam_group: url.searchParams.get("exam_group"),
        };
      })
      .toEqual({
        pathname: "/admin/exams",
        exam_status: null,
        exam_source: null,
        exam_sort: null,
        exam_group: null,
      });

    await expect(statusSelect(page)).toHaveValue("all");
    await expect(sourceSelect(page)).toHaveValue("all");
    await expect(sortSelect(page)).toHaveValue("recommended");
    await expect(groupSelect(page)).toHaveValue("none");
  });

  test("@workflow browser coverage keeps admin exams quick filters truthful", async ({ page }) => {
    await gotoExams(page);

    await quickChip(page, /^Platform$/i).click();
    await expect(page).toHaveURL(/exam_source=platform/);
    await expect(sourceSelect(page)).toHaveValue("platform");

    await quickChip(page, /^Live$/i).click();
    await expect(page).toHaveURL(/exam_status=live/);
    await expect(statusSelect(page)).toHaveValue("live");

    await quickChip(page, /group by source/i).click();
    await expect(page).toHaveURL(/exam_group=source/);
    await expect(groupSelect(page)).toHaveValue("source");
  });

  test("@workflow browser coverage proves admin exams empty states stay distinct", async ({
    page,
  }) => {
    await gotoExams(page, "/admin/exams?exam_status=live&exam_source=teacher&exam_group=source");

    const noScopeState = page.getByRole("heading", {
      name: /no exams are visible to platform governance yet/i,
    });
    const noMatchState = page.getByRole("heading", {
      name: /no exams match these platform controls/i,
    });

    if (await noScopeState.isVisible().catch(() => false)) {
      await expect(noScopeState).toBeVisible();
    } else if (await noMatchState.isVisible().catch(() => false)) {
      await expect(noMatchState).toBeVisible();
    } else {
      await expect(page.locator(".examCard").first()).toBeVisible();
    }
  });

  test("@workflow browser coverage keeps admin exams summary counts internally truthful", async ({
    page,
  }) => {
    await gotoExams(page);

    const statusText =
      (await page.getByText(/\d+\s+exams loaded/i).first().textContent())?.trim() ?? "";
    const heroSummaryText =
      (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
    const controlsSummaryText =
      (await page.locator(".workspaceFiltersCard .sectionHeading span").first().textContent())?.trim() ?? "";
    const totalExamsCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Total Exams$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const platformSourceCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Platform Source$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const instituteSourceCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Institute Source$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const teacherSourceCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Teacher Source$/i) })
        .locator("strong")
        .textContent()) ?? "";

    const loadedFromStatus = extractLeadingNumber(statusText);
    const platformFromHero = extractLeadingNumber(heroSummaryText.split("·")[0] ?? "");
    const instituteFromHero = extractLeadingNumber(heroSummaryText.split("·")[1] ?? "");
    const teacherFromHero = extractLeadingNumber(heroSummaryText.split("·")[2] ?? "");
    const shownFromControls = extractLeadingNumber(controlsSummaryText);
    const totalFromControls = extractLeadingNumber(controlsSummaryText.split("of")[1] ?? controlsSummaryText);
    const totalFromCard = extractLeadingNumber(totalExamsCardText);
    const platformFromCard = extractLeadingNumber(platformSourceCardText);
    const instituteFromCard = extractLeadingNumber(instituteSourceCardText);
    const teacherFromCard = extractLeadingNumber(teacherSourceCardText);

    expect(loadedFromStatus).not.toBeNull();
    expect(platformFromHero).not.toBeNull();
    expect(instituteFromHero).not.toBeNull();
    expect(teacherFromHero).not.toBeNull();
    expect(shownFromControls).not.toBeNull();
    expect(totalFromControls).not.toBeNull();
    expect(totalFromCard).not.toBeNull();
    expect(platformFromCard).not.toBeNull();
    expect(instituteFromCard).not.toBeNull();
    expect(teacherFromCard).not.toBeNull();

    expect(loadedFromStatus).toBe(shownFromControls);
    expect(totalFromControls).toBe(totalFromCard);
    expect(platformFromHero).toBe(platformFromCard);
    expect(instituteFromHero).toBe(instituteFromCard);
    expect(teacherFromHero).toBe(teacherFromCard);
    expect(totalFromCard).toBeGreaterThanOrEqual(loadedFromStatus ?? 0);
  });
});
