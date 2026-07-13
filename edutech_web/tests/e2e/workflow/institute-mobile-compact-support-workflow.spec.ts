import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import { expectInstituteWorkspace } from "../helpers/navigation";
import { gotoWithRuntimeRecovery } from "../helpers/runtime";

async function openMobileInstituteNav(page: Page) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: /institute admin navigation/i })).toBeVisible();
  await expect(page.locator("#mobile-workspace-menu")).toBeVisible();
  return page.locator("#mobile-workspace-menu");
}

test.describe("Institute mobile compact support workflow", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("institute"),
    "Institute Playwright credentials are not configured.",
  );

  test("@workflow institute mobile viewport supports compact operator pages without layout collapse", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRuntimeRecovery(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    const mobileNav = await openMobileInstituteNav(page);

    await mobileNav.getByRole("link", { name: /^reports$/i }).click();
    await expect(page).toHaveURL(/\/institute\/reports(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^reports$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /pending publication/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/dashboard");
    const mobileNavAfterReports = await openMobileInstituteNav(page);
    await mobileNavAfterReports.getByRole("link", { name: /^economy$/i }).click();
    await expect(page).toHaveURL(/\/institute\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /economy oversight/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /review one economy lane at a time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /refresh unlocks/i })).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/dashboard");
    const mobileNavAfterEconomy = await openMobileInstituteNav(page);
    await mobileNavAfterEconomy.getByRole("link", { name: /^security$/i }).click();
    await expect(page).toHaveURL(/\/institute\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /security oversight/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam scope: all$/i).first()).toBeVisible();
    await expect(page.getByText(/^attempt scope: all$/i).first()).toBeVisible();

    await gotoWithRuntimeRecovery(page, "/institute/dashboard");
    const mobileNavAfterSecurity = await openMobileInstituteNav(page);
    await mobileNavAfterSecurity.getByRole("link", { name: /^settings$/i }).click();
    await expect(page).toHaveURL(/\/institute\/settings(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^settings$/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /manage exam defaults/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible();
  });
});
