import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectAdminWorkspace } from "../helpers/navigation";

const lanes = [
  { tab: "overview", heading: /^overview$/i },
  { tab: "catalog", heading: /^catalog$/i },
  { tab: "access-control", heading: /access control/i },
  { tab: "question-bank", heading: /question bank commerce/i },
  { tab: "support-ops", heading: /support ops/i },
  { tab: "bootstrap", heading: /bootstrap/i },
] as const;

const focusedRoutes = [
  { url: "/admin/economy?tab=overview&focus=policy", activeTabHref: '/admin/economy?tab=overview', focusValue: "policy" },
  { url: "/admin/economy?tab=catalog&focus=star-packs", activeTabHref: '/admin/economy?tab=catalog', focusValue: "star-packs" },
  { url: "/admin/economy?tab=access-control&focus=unlocks", activeTabHref: '/admin/economy?tab=access-control', focusValue: "unlocks" },
  { url: "/admin/economy?tab=question-bank&focus=visibility", activeTabHref: '/admin/economy?tab=question-bank', focusValue: "visibility" },
  { url: "/admin/economy?tab=support-ops&focus=student-support", activeTabHref: '/admin/economy?tab=support-ops', focusValue: "student-support" },
] as const;

test.describe("Admin economy lane navigation", () => {
  test.skip(testRequiresRole("admin"), "Admin Playwright credentials are not configured.");

  const workspaceNav = (page: Page) =>
    page.getByRole("navigation", { name: /economy workspace sections/i });

  test("@workflow admin can move between economy lanes and preserve tab selection", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    for (const lane of lanes) {
      await page.goto(`/admin/economy?tab=${lane.tab}`);
      await expect(page).toHaveURL(new RegExp(`/admin/economy\\?tab=${lane.tab.replace("-", "\\-")}`));
      await expect(workspaceNav(page).locator(`a[href="/admin/economy?tab=${lane.tab}"]`)).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("heading", { name: lane.heading })).toBeVisible();
    }
  });

  test("@workflow invalid economy lane falls back to overview", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy?tab=not-a-real-lane");

    await expect(workspaceNav(page).locator('a[href="/admin/economy?tab=overview"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();
  });

  test("@workflow admin can deep-link into focused economy subsections", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    for (const route of focusedRoutes) {
      await page.goto(route.url);
      await expect(page).toHaveURL(route.url);
      await expect(workspaceNav(page).locator(`a[href="${route.activeTabHref}"]`)).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(page.getByRole("combobox", { name: /economy subsection/i })).toHaveValue(route.focusValue);
    }
  });

  test("@workflow admin can scope economy workspace to a selected institute", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await page.goto("/admin/economy?tab=catalog&focus=star-packs");
    const scopeSelect = page.getByRole("combobox", { name: /institute scope/i });
    await expect(scopeSelect).toBeVisible();
    const scopeOptions = await scopeSelect.locator("option").evaluateAll((options) =>
      options.map((option) => ({
        value: (option as HTMLOptionElement).value,
        label: (option as HTMLOptionElement).label,
      })),
    );
    const selectedScope = scopeOptions.find((option) => option.value);
    expect(selectedScope?.value).toBeTruthy();

    await page.goto(`/admin/economy?tab=catalog&focus=star-packs&institute=${selectedScope!.value}`);
    await expect(scopeSelect).toHaveValue(selectedScope!.value);

    const instituteSelect = page.getByRole("combobox", { name: /^institute$/i }).first();
    await expect(instituteSelect).toBeVisible();
    await expect(instituteSelect.locator("option")).toHaveCount(1);

    const scopedQuestionBankHref = `/admin/economy?tab=question-bank&focus=plans&institute=${selectedScope!.value}`;
    await page.goto(scopedQuestionBankHref);
    const scopedPlanInstituteSelect = page.getByRole("combobox", { name: /^institute$/i }).first();
    await expect(scopedPlanInstituteSelect).toBeVisible();
    await expect(scopedPlanInstituteSelect.locator("option")).toHaveCount(1);
  });
});
