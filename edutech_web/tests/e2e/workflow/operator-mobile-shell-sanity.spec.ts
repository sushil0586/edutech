import { expect, test, type Page } from "@playwright/test";
import { loginAsRole, testRequiresRole } from "../helpers/auth";
import {
  expectAdminWorkspace,
  expectInstituteWorkspace,
  expectTeacherWorkspace,
} from "../helpers/navigation";

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
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

async function openMobileWorkspaceNav(page: Page, ariaLabel: RegExp, panelId: string) {
  const mobileNavToggle = page.getByRole("button", { name: /menu/i });
  await expect(mobileNavToggle).toBeVisible();
  await mobileNavToggle.click();
  await expect(page.getByRole("navigation", { name: ariaLabel })).toBeVisible();
  await expect(page.locator(`#${panelId}`)).toBeVisible();
  return page.locator(`#${panelId}`);
}

test.describe("Operator mobile shell sanity", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test.skip(
    testRequiresRole("admin") || testRequiresRole("institute") || testRequiresRole("teacher"),
    "Admin, institute, and teacher Playwright credentials are required.",
  );

  test("@workflow admin mobile viewport keeps dense economy and security routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "admin");
    await expectAdminWorkspace(page);

    await gotoWithRetry(page, "/admin");
    await expect(page.getByRole("heading", { name: /platform control for/i }).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /platform admin navigation/i, "mobile-workspace-menu");
    await expect(mobileNav.getByRole("link", { name: /^economy$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^security$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reports$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^economy$/i }).click();
    await expect(page).toHaveURL(/\/admin\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /^economy$/i }).first()).toBeVisible();
    await expect(page.getByText(/scope the page before reviewing data/i).first()).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /platform admin navigation/i, "mobile-workspace-menu");
    await reopenedNav.getByRole("link", { name: /^security$/i }).click();
    await expect(page).toHaveURL(/\/admin\/security(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /security/i }).first()).toBeVisible();
    await expect(page.getByText(/live integrity monitoring|security modes/i).first()).toBeVisible();
  });

  test("@workflow institute mobile viewport keeps dense economy and review routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "institute");
    await expectInstituteWorkspace(page);

    await gotoWithRetry(page, "/institute/dashboard");
    await expect(page.getByText(/institute control/i).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /institute admin navigation/i, "mobile-workspace-menu");
    await expect(mobileNav.getByRole("link", { name: /^economy$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^security$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^economy$/i }).click();
    await expect(page).toHaveURL(/\/institute\/economy(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /economy oversight/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /packages currently available to this institute/i })).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /institute admin navigation/i, "mobile-workspace-menu");
    await reopenedNav.getByRole("link", { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/institute\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByText(/quick triage/i).first()).toBeVisible();
  });

  test("@workflow teacher mobile viewport keeps dense results and review routes reachable", async ({
    page,
  }) => {
    await loginAsRole(page, "teacher");
    await expectTeacherWorkspace(page);

    await gotoWithRetry(page, "/teacher/dashboard");
    await expect(page.getByRole("heading", { name: /delivery dashboard/i }).first()).toBeVisible();

    const mobileNav = await openMobileWorkspaceNav(page, /teacher navigation/i, "mobile-teacher-menu");
    await expect(mobileNav.getByRole("link", { name: /^results$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^reviews$/i })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: /^question bank$/i })).toBeVisible();

    await mobileNav.getByRole("link", { name: /^results$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/results(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /results/i }).first()).toBeVisible();
    await expect(page.getByText(/^exam publish readiness$/i).first()).toBeVisible();

    const reopenedNav = await openMobileWorkspaceNav(page, /teacher navigation/i, "mobile-teacher-menu");
    await reopenedNav.getByRole("link", { name: /^reviews$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/reviews(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /review queue/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /open results/i }).first()).toBeVisible();
  });
});
