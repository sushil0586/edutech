import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function gotoSettings(page: Page) {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
}

test.describe("Admin settings browser functionality coverage", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);
  });

  test("@workflow browser coverage keeps admin settings governance summary truthful", async ({
    page,
  }) => {
    await gotoSettings(page);

    await expect(page.getByText(/current live control lanes/i).first()).toBeVisible();
    await expect(
      page.getByText(/what still needs dedicated contracts before it becomes configurable here/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/current institute footprint/i).first()).toBeVisible();

    await expect(page.getByText(/^institutes$/i).first()).toBeVisible();
    await expect(page.getByText(/people in scope/i).first()).toBeVisible();
    await expect(page.getByText(/configured defaults/i).first()).toBeVisible();
    await expect(page.getByText(/academic backbone/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps economy policy governance visible from settings", async ({
    page,
  }) => {
    await gotoSettings(page);

    await expect(page.getByText(/economy policy/i).first()).toBeVisible();
    await expect(page.getByText(/institute-admin support limits/i).first()).toBeVisible();
    await expect(page.getByText(/policy history/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save economy policy/i })).toBeVisible();
  });

  test("@workflow browser coverage keeps admin settings handoff routes truthful", async ({
    page,
  }) => {
    await gotoSettings(page);

    await expect(page.locator('a[href="/admin/people"]').first()).toBeVisible();
    await expect(page.locator('a[href="/admin/academic-setup"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage people/i })).toHaveAttribute("href", "/admin/people");
    await expect(page.getByRole("link", { name: /manage academics/i })).toHaveAttribute(
      "href",
      "/admin/academic-setup",
    );

    await page.getByRole("link", { name: /manage people/i }).click();
    await expect(page).toHaveURL(/\/admin\/people(?:\?.*)?$/);
    await expect(page.getByText(/student roster|teacher roster/i).first()).toBeVisible();

    await gotoSettings(page);
    await page.getByRole("link", { name: /manage academics/i }).click();
    await expect(page).toHaveURL(/\/admin\/academic-setup(?:\?.*)?$/);
    await expect(page.getByText(/academic setup/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps institute footprint rows visible when settings load", async ({
    page,
  }) => {
    await gotoSettings(page);

    const footprintRows = page.locator(".dashboardPanel .weakTopicRow");
    if ((await footprintRows.count()) > 0) {
      await expect(footprintRows.first()).toBeVisible();
    } else {
      await expect(
        page.getByText(/no institute records are currently available to this platform-admin session/i).first(),
      ).toBeVisible();
    }
  });

  test("@workflow browser coverage keeps admin settings institute counts internally truthful", async ({
    page,
  }) => {
    await gotoSettings(page);

    const statusText =
      (await page.getByText(/\d+\s+active institutes/i).first().textContent())?.trim() ?? "";
    const heroSummaryText =
      (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
    const institutesCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Institutes$/i) })
        .locator("strong")
        .textContent()) ?? "";
    const institutesCardDetailText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^Institutes$/i) })
        .locator("small")
        .textContent()) ?? "";

    const activeFromStatus = extractLeadingNumber(statusText);
    const totalFromHero = extractLeadingNumber(heroSummaryText.split("·")[1] ?? "");
    const totalFromCard = extractLeadingNumber(institutesCardText);
    const activeFromCard = extractLeadingNumber(institutesCardDetailText);

    expect(activeFromStatus).not.toBeNull();
    expect(totalFromHero).not.toBeNull();
    expect(totalFromCard).not.toBeNull();
    expect(activeFromCard).not.toBeNull();

    expect(totalFromHero).toBe(totalFromCard);
    expect(activeFromStatus).toBe(activeFromCard);
    expect(totalFromCard).toBeGreaterThanOrEqual(activeFromCard ?? 0);
  });
});
