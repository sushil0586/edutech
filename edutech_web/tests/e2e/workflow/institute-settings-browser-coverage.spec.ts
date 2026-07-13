import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";

function extractLeadingNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

async function gotoSettings(page: Page) {
  await page.goto("/institute/settings");
  await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
}

test.describe("Institute settings browser functionality coverage", () => {
  test.skip(testRequiresRole("institute"), "Institute Playwright credentials are not configured.");

  test.beforeEach(async ({ page }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);
  });

  test("@workflow browser coverage keeps institute settings summary truthful", async ({ page }) => {
    await gotoSettings(page);

    await expect(page.getByText(/settings foundation is live/i).first()).toBeVisible();
    await expect(page.getByText(/editable now/i).first()).toBeVisible();
    await expect(page.getByText(/next settings layers/i).first()).toBeVisible();
    await expect(page.getByText(/backend-driven rollout/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps institute settings handoff routes truthful", async ({ page }) => {
    await gotoSettings(page);

    await expect(page.locator('a[href="/institute/academic-setup"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage exam defaults/i })).toHaveAttribute(
      "href",
      "/institute/academic-setup",
    );
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute(
      "href",
      "/institute/dashboard",
    );

    await page.getByRole("link", { name: /manage exam defaults/i }).click();
    await expect(page).toHaveURL(/\/institute\/academic-setup(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /academic setup/i }).first()).toBeVisible();

    await gotoSettings(page);
    await page.getByRole("link", { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL(/\/institute\/dashboard(?:\?.*)?$/);
    await expect(page.getByText(/institute control/i).first()).toBeVisible();
  });

  test("@workflow browser coverage keeps institute settings counts internally truthful", async ({ page }) => {
    await gotoSettings(page);

    const heroSummaryText =
      (await page.locator(".studentInsightHeroCopy small").first().textContent())?.trim() ?? "";
    const defaultsCardText =
      (await page
        .locator(".resultsSummaryGrid .metricCard")
        .filter({ has: page.getByText(/^exam defaults$/i) })
        .locator("strong")
        .textContent()) ?? "";

    const defaultsFromHero = extractLeadingNumber(heroSummaryText.split("·")[1] ?? "");
    const defaultsFromCard = extractLeadingNumber(defaultsCardText);

    expect(defaultsFromHero).not.toBeNull();
    expect(defaultsFromCard).not.toBeNull();
    expect(defaultsFromHero).toBe(defaultsFromCard);
  });
});
